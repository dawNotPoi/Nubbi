import { Logger } from "@nestjs/common";
import type { NotificationListener, RpcMessage, ServerRequestHandler } from "./protocol.ts";

const logger = new Logger("CodexRpcChannel");

/** 等待中的 RPC 调用，退出或超时后必须释放。 */
type PendingRequest = { resolve: (value: unknown) => void; reject: (error: Error) => void; timeout: NodeJS.Timeout };
/** Codex 的 JSON-RPC 请求关联与通知分发，不负责子进程启动。 */
export class CodexRpcChannel {
  private nextRequestId = 1;
  private readonly pendingRequests = new Map<number | string, PendingRequest>();
  private readonly listeners = new Set<NotificationListener>();
  private serverRequestHandler: ServerRequestHandler | null = null;

  /**
   * 注入消息写入能力。
   * @param writeMessage 写入已经连接的进程。
   */
  public constructor(private readonly writeMessage: (message: RpcMessage) => void) {}

  /**
   * 发送请求并等待对应 ID 的响应。
   * @param method RPC 方法名。
   * @param params 请求参数。
   * @returns 远端响应。
   */
  public request<T>(method: string, params?: unknown): Promise<T> {
    const id = this.nextRequestId++;
    return new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Codex 请求超时：${method}`));
      }, 30_000);
      this.pendingRequests.set(id, { resolve, reject, timeout });
      try {
        this.writeMessage({ method, id, params });
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      }
    }) as Promise<T>;
  }

  /**
   * 注册服务端通知。
   * @param listener 通知处理函数。
   * @returns 移除订阅的函数。
   */
  public onNotification(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 配置动态工具请求处理器。
   * @param handler 服务端请求处理函数。
   * @returns 无返回值。
   */
  public setServerRequestHandler(handler: ServerRequestHandler): void {
    this.serverRequestHandler = handler;
  }

  /**
   * 解析进程输出的一行 JSON，分发请求响应或通知。
   * @param line 单行输出。
   * @returns 无返回值。
   */
  public acceptLine(line: string): void {
    let message: RpcMessage;
    try {
      message = JSON.parse(line) as RpcMessage;
    } catch {
      return;
    }
    if (!message || typeof message !== "object") return;
    if (message.id !== undefined && message.method) {
      void this.handleServerRequest(message);
      return;
    }
    if (message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (!pending) return;
      this.pendingRequests.delete(message.id);
      clearTimeout(pending.timeout);
      if (message.error) pending.reject(new Error(message.error.message ?? "Codex 请求失败"));
      else pending.resolve(message.result);
    } else if (message.method) this.publishNotification(message.method, message.params);
  }

  /**
   * 连接终止时拒绝全部请求，并唤醒正在等待 turn 完成的订阅者。
   * @param error 连接失败原因。
   * @returns 无返回值。
   */
  public fail(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
    this.publishNotification("assistant/connectionFailed", { message: error.message });
  }

  /** 单个订阅者的异常不能中断其他运行的通知分发。 */
  private publishNotification(method: string, params: unknown): void {
    for (const listener of this.listeners) {
      try {
        listener(method, params);
      } catch (error) {
        logger.warn("Codex 通知处理失败", { error });
      }
    }
  }

  /** 执行服务端请求并回传结果；断连时只记录失败，不制造未处理拒绝。 */
  private async handleServerRequest(message: RpcMessage): Promise<void> {
    let response: RpcMessage;
    try {
      if (!this.serverRequestHandler) throw new Error("未配置服务端请求处理器");
      response = { id: message.id, result: await this.serverRequestHandler(message.method!, message.params) };
    } catch (error) {
      response = {
        id: message.id,
        error: { code: -32000, message: error instanceof Error ? error.message : "请求处理失败" },
      };
    }
    try {
      this.writeMessage(response);
    } catch {
      /* 连接已关闭，挂起调用由 fail 统一清理。 */
    }
  }
}
