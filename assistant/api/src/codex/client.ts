import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { env, projectRoot } from "../env.js";
import type {
  NotificationListener,
  RpcMessage,
  ServerRequestHandler,
} from "./protocol.js";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

const codexHome = path.join(projectRoot, "data", "codex");
export const codexWorkspace = path.join(codexHome, "workspace");

/**
 * 解析 Codex CLI 的可执行入口：
 * 优先使用配置的路径，其次在 Windows 全局 npm 目录探测，最后回退到 PATH 中的 codex。
 */
const resolveCommand = (): { command: string; args: string[] } => {
  const configured = env.CODEX_CLI_PATH;
  if (configured) {
    // 配置指向 .js 脚本时用当前 Node 进程运行。
    return configured.endsWith(".js")
      ? { command: process.execPath, args: [configured] }
      : { command: configured, args: [] };
  }
  if (process.platform === "win32" && process.env.APPDATA) {
    const script = path.join(
      process.env.APPDATA,
      "npm",
      "node_modules",
      "@openai",
      "codex",
      "bin",
      "codex.js",
    );
    if (existsSync(script)) return { command: process.execPath, args: [script] };
  }
  return { command: "codex", args: [] };
};

/**
 * Codex App Server 的 JSON-RPC over stdio 客户端。
 * 负责拉起子进程、按行收发协议消息、维护请求/通知分发。
 */
class CodexAppServerClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private startPromise: Promise<void> | null = null;
  private initialized = false;
  private nextId = 1;
  private pending = new Map<number | string, PendingRequest>();
  private listeners = new Set<NotificationListener>();
  private requestHandler: ServerRequestHandler | null = null;

  async start(): Promise<void> {
    // 幂等启动：已有启动流程或进程就绪时直接返回。
    if (this.startPromise) return this.startPromise;
    if (this.process && this.initialized) return;
    this.startPromise = this.spawnAndInitialize()
      .catch((error: unknown) => {
        this.process?.kill();
        const failure = error instanceof Error ? error : new Error("Codex 初始化失败");
        this.handleFailure(failure);
        throw failure;
      })
      .finally(() => {
        this.startPromise = null;
      });
    return this.startPromise;
  }

  private async spawnAndInitialize(): Promise<void> {
    await mkdir(codexWorkspace, { recursive: true });
    const executable = resolveCommand();
    // 以 app-server 模式启动，通过 stdio 做 JSON-RPC 通信。
    const child = spawn(executable.command, [...executable.args, "app-server", "--stdio"], {
      cwd: codexWorkspace,
      env: { ...process.env, CODEX_HOME: codexHome },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.process = child;
    readline.createInterface({ input: child.stdout }).on("line", (line) => {
      this.handleLine(line);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const message = chunk.toString("utf8").trim();
      if (message) console.warn(`[Codex App Server] ${message}`);
    });
    child.once("error", (error) => this.handleFailure(error));
    child.once("exit", (code) => this.handleExit(code));
    // 先完成握手初始化，再挂载 Assistant skills 根目录。
    await this.sendRequest("initialize", {
      clientInfo: { name: "nubbi-assistant", title: "Nubbi Assistant", version: "0.1.0" },
      capabilities: { experimentalApi: true, requestAttestation: false },
    });
    this.notify("initialized");
    await this.sendRequest("skills/extraRoots/set", {
      extraRoots: [path.join(projectRoot, "skills")],
    });
    this.initialized = true;
  }

  async request<T>(method: string, params?: unknown): Promise<T> {
    await this.start();
    return this.sendRequest<T>(method, params);
  }

  private sendRequest<T>(method: string, params?: unknown): Promise<T> {
    const id = this.nextId++;
    const result = new Promise<unknown>((resolve, reject) => {
      // 30 秒超时：防止子进程无响应时调用方永久挂起。
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex 请求超时：${method}`));
      }, 30_000);
      this.pending.set(id, { resolve, reject, timeout });
    });
    this.write({ method, id, params });
    return result as Promise<T>;
  }

  /** 发送无响应的通知消息。 */
  notify(method: string, params?: unknown): void {
    this.write({ method, params });
  }

  onNotification(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setServerRequestHandler(handler: ServerRequestHandler): void {
    this.requestHandler = handler;
  }

  stop(): void {
    this.process?.kill();
    this.process = null;
    this.initialized = false;
  }

  private write(message: RpcMessage): void {
    if (!this.process?.stdin.writable) throw new Error("Codex App Server 未运行");
    // 每行一条 JSON 消息，与 app-server 的 stdio 协议一致。
    this.process.stdin.write(`${JSON.stringify(message)}\n`);
  }

  /** 处理一行 stdout：分发到请求响应、服务端请求或通知监听器。 */
  private handleLine(line: string): void {
    let message: RpcMessage;
    try {
      message = JSON.parse(line) as RpcMessage;
    } catch {
      return;
    }
    if (message.id !== undefined && message.method) {
      void this.handleServerRequest(message);
      return;
    }
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timeout);
      if (message.error) pending.reject(new Error(message.error.message ?? "Codex 请求失败"));
      else pending.resolve(message.result);
      return;
    }
    if (message.method) {
      this.listeners.forEach((listener) => listener(message.method!, message.params));
    }
  }

  private async handleServerRequest(message: RpcMessage): Promise<void> {
    try {
      if (!this.requestHandler) throw new Error("未配置服务端请求处理器");
      const result = await this.requestHandler(message.method!, message.params);
      this.write({ id: message.id, result });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "请求处理失败";
      this.write({ id: message.id, error: { code: -32000, message: detail } });
    }
  }

  private handleExit(code: number | null): void {
    this.handleFailure(new Error(`Codex App Server 已退出 (${code ?? "unknown"})`));
  }

  private handleFailure(error: Error): void {
    this.process = null;
    this.initialized = false;
    this.pending.forEach((request) => {
      clearTimeout(request.timeout);
      request.reject(error);
    });
    this.pending.clear();
  }
}

export const codexClient = new CodexAppServerClient();
