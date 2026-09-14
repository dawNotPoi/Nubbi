/** 解码后的 SSE 事件；注释及无 data 的心跳不会生成事件。 */
export type ServerSentEvent = { event: string; data: string };

/** 跨 chunk 保留行缓冲，兼容 LF、CRLF、CR 和多行 data。 */
export class SseDecoder {
  private buffer = "";
  private eventName = "message";
  private dataLines: string[] = [];

  /**
   * 接收一段文本并取出完整事件，末尾半行留待下次处理。
   * @param text 已完成 UTF-8 解码的文本。
   * @param final 是否已到输入末尾。
   * @returns 本次解出的事件。
   */
  public push(text: string, final = false): ServerSentEvent[] {
    this.buffer += text;
    const events: ServerSentEvent[] = [];
    while (this.buffer.length) {
      const boundary = this.buffer.search(/[\r\n]/);
      if (boundary < 0) break;
      if (!final && this.buffer[boundary] === "\r" && boundary === this.buffer.length - 1) break;
      const width = this.buffer.slice(boundary, boundary + 2) === "\r\n" ? 2 : 1;
      this.consumeLine(this.buffer.slice(0, boundary), events);
      this.buffer = this.buffer.slice(boundary + width);
    }
    if (final) {
      if (this.buffer) this.consumeLine(this.buffer, events);
      this.buffer = "";
      this.consumeLine("", events);
    }
    return events;
  }

  /** 归并字段；空行结束当前事件，只移除冒号后的一个可选空格。 */
  private consumeLine(line: string, events: ServerSentEvent[]): void {
    if (!line) {
      if (this.dataLines.length) events.push({ event: this.eventName, data: this.dataLines.join("\n") });
      this.dataLines = [];
      this.eventName = "message";
      return;
    }
    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") this.eventName = value;
    if (field === "data") this.dataLines.push(value);
  }
}

/**
 * 读取字节流并逐事件输出；离开迭代时释放 reader，取消时中止挂起读取。
 * @param body HTTP 响应的字节流。
 * @param abortSignal 当前操作的取消信号。
 * @returns 按原始顺序产生 SSE 事件的异步迭代器。
 */
export async function* readServerSentEvents(
  body: ReadableStream<Uint8Array>,
  abortSignal: AbortSignal,
): AsyncGenerator<ServerSentEvent> {
  abortSignal.throwIfAborted();
  const reader = body.getReader();
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  const decoder = new SseDecoder();
  const cancelRead = (): void => {
    void reader.cancel().catch(() => undefined);
  };
  abortSignal.addEventListener("abort", cancelRead, { once: true });
  try {
    while (true) {
      const { value, done } = await reader.read();
      abortSignal.throwIfAborted();
      yield* decoder.push(utf8.decode(value, { stream: !done }), done);
      if (done) return;
    }
  } finally {
    abortSignal.removeEventListener("abort", cancelRead);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
