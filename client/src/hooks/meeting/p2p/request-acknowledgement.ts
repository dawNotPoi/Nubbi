import type { Socket } from "socket.io-client";

/** 超时不保证服务器未执行，不能自动重试写操作。 */
export type Acknowledgement<T> = { ok: true; value: T } | { ok: false; reason: "DISCONNECTED" | "TIMEOUT" };

/** @param socket 当前连接。@param event 事件名。@param payload 请求内容。@param timeoutMs 等待上限。@returns 确认或连接错误。 */
export function requestAcknowledgement<T>(socket: Socket | null, event: string, payload: object, timeoutMs = 10_000): Promise<Acknowledgement<T>> {
  if (!socket?.connected) return Promise.resolve({ ok: false, reason: "DISCONNECTED" });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: Acknowledgement<T>): void => {
      if (settled) return;
      settled = true;
      socket.off("disconnect", disconnected);
      resolve(result);
    };
    const disconnected = (): void => finish({ ok: false, reason: "DISCONNECTED" });
    socket.on("disconnect", disconnected);
    // 在线检查和发送之间无异步间隔；不设置 retries，不把已超时的写操作自动重放。
    // 原生超时同时释放 Socket.IO 内部 ack，避免仅清理业务计时器造成回调泄漏。
    socket.timeout(timeoutMs).emit(event, payload, (error: Error | null, value: T) => {
      finish(error ? { ok: false, reason: socket.connected ? "TIMEOUT" : "DISCONNECTED" } : { ok: true, value });
    });
  });
}
