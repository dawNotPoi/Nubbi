import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { projectRoot } from "../../config/env.ts";
import { codexHome, codexWorkspace, resolveCommand } from "./process-config.ts";
import { CodexRpcChannel } from "./rpc-channel.ts";
import type { NotificationListener, RpcMessage, ServerRequestHandler } from "./protocol.ts";

/** Codex 子进程生命周期，JSON-RPC 关联与解析由 channel 负责。 */
class CodexAppServerClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private startPromise: Promise<void> | null = null;
  private initialized = false;
  private readonly channel = new CodexRpcChannel((message) => this.writeMessage(message));

  /**
   * 幂等启动并完成握手。
   * @returns 初始化完成的 Promise。
   */
  public async start(): Promise<void> {
    if (this.startPromise) return this.startPromise;
    if (this.process && this.initialized) return;
    this.startPromise = this.spawnAndInitialize()
      .catch((error: unknown) => {
        this.stop();
        throw error;
      })
      .finally(() => {
        this.startPromise = null;
      });
    return this.startPromise;
  }

  /**
   * 确保启动后发送 RPC 请求。
   * @param method RPC 方法。
   * @param params 请求参数。
   * @returns 远端响应。
   */
  public async request<T>(method: string, params?: unknown): Promise<T> {
    await this.start();
    return this.channel.request<T>(method, params);
  }

  /**
   * 注册通知监听器。
   * @param listener 通知处理函数。
   * @returns 注销函数。
   */
  public onNotification(listener: NotificationListener): () => void {
    return this.channel.onNotification(listener);
  }

  /**
   * 配置动态工具请求处理器。
   * @param handler 服务端请求处理函数。
   * @returns 无返回值。
   */
  public setServerRequestHandler(handler: ServerRequestHandler): void {
    this.channel.setServerRequestHandler(handler);
  }

  /**
   * 发送无需响应的 RPC 通知。
   * @param method 方法名。
   * @param params 参数。
   * @returns 无返回值。
   */
  public notify(method: string, params?: unknown): void {
    this.writeMessage({ method, params });
  }

  /**
   * 停止子进程并释放所有挂起调用。
   * @returns 无返回值。
   */
  public stop(): void {
    const child = this.process;
    this.process = null;
    this.initialized = false;
    child?.kill();
    this.channel.fail(new Error("Codex App Server 已停止"));
  }

  /** 启动 stdio 子进程，完成初始化后挂载 Assistant 的 Skill 根目录。 */
  private async spawnAndInitialize(): Promise<void> {
    await mkdir(codexWorkspace, { recursive: true });
    const executable = resolveCommand();
    const child = spawn(executable.command, [...executable.args, "app-server", "--stdio"], {
      cwd: codexWorkspace,
      env: { ...process.env, CODEX_HOME: codexHome },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.process = child;
    const lines = readline.createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      if (this.process === child) this.channel.acceptLine(line);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const message = chunk.toString("utf8").trim();
      if (message) console.warn(`[Codex App Server] ${message}`);
    });
    const fail = (error: Error): void => {
      lines.close();
      if (this.process !== child) return;
      this.process = null;
      this.initialized = false;
      this.channel.fail(error);
    };
    child.once("error", fail);
    child.once("exit", (code) => fail(new Error(`Codex App Server 已退出 (${code ?? "unknown"})`)));
    await this.channel.request("initialize", {
      clientInfo: { name: "nubbi-assistant", title: "Nubbi Assistant", version: "0.1.0" },
      capabilities: { experimentalApi: true, requestAttestation: false },
    });
    this.notify("initialized");
    await this.channel.request("skills/extraRoots/set", { extraRoots: [path.join(projectRoot, "skills")] });
    this.initialized = true;
  }

  /** 向当前子进程写入一条完整协议消息。 */
  private writeMessage(message: RpcMessage): void {
    if (!this.process?.stdin.writable) throw new Error("Codex App Server 未运行");
    this.process.stdin.write(`${JSON.stringify(message)}\n`);
  }
}

/** 应用共享的 Codex 通信入口。 */
export const codexClient = new CodexAppServerClient();
export { codexWorkspace } from "./process-config.ts";
