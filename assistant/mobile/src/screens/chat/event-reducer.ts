import type { Message, MessagePart, StreamEvent } from "../../types";

/**
 * 把单个 SSE 事件增量应用到临时助手消息上：
 * 文本累积到最后一个 text 块，工具调用先占位再补结果，错误追加 error 块。
 * @param message 当前正在渲染的临时助手消息。
 * @param event 收到的单个 SSE 事件。
 * @returns 应用事件后的新消息对象。
 */
export const applyEvent = (message: Message, event: StreamEvent): Message => {
  if (event.type === "skill-active") {
    return {
      ...message,
      parts: [...message.parts, {
        type: "skill",
        name: event.name,
        description: event.description,
      }],
    };
  }
  if (event.type === "tool-start") {
    const part: MessagePart = {
      type: "tool",
      server: event.server,
      tool: event.tool,
      arguments: event.arguments,
      result: "",
      status: "running",
    };
    return { ...message, parts: [...message.parts, part] };
  }
  if (event.type === "tool-result") {
    return {
      ...message,
      parts: message.parts.map((part) => part.type === "tool"
        && part.server === event.server
        && part.tool === event.tool
        && part.status === "running"
        ? { ...part, result: event.result, status: "done" as const }
        : part),
    };
  }
  if (event.type === "text-delta") {
    const parts = [...message.parts];
    const last = parts.at(-1);
    if (last?.type === "text") {
      parts[parts.length - 1] = { ...last, text: last.text + event.text };
    } else {
      parts.push({ type: "text", text: event.text });
    }
    return { ...message, parts };
  }
  if (event.type === "error") {
    return {
      ...message,
      parts: [...message.parts, { type: "error", message: event.message }],
    };
  }
  return event.type === "done" ? event.message : message;
};
