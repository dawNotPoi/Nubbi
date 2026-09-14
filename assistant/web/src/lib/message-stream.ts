import type { Message, MessagePart, StreamEvent } from "../types";

/**
 * 生成过程中的临时消息：发送完成前占位展示，结束后用服务端数据替换。
 * @param role 消息角色（用户或助手）。
 * @param parts 消息内容块列表。
 * @returns 带临时 ID 的消息对象。
 */
export const temporaryMessage = (
  role: Message["role"],
  parts: MessagePart[],
): Message => ({
  id: `temporary-${role}-${Date.now()}`,
  role,
  parts,
  createdAt: new Date().toISOString(),
});

/**
 * 把单个 SSE 事件增量折叠进助手消息的 parts 数组。
 * @param parts 当前累积的 parts 数组。
 * @param event 收到的单个 SSE 事件。
 * @returns 应用事件后的新 parts 数组。
 */
export const reduceEvent = (parts: MessagePart[], event: StreamEvent): MessagePart[] => {
  if (event.type === "text-delta") {
    const last = parts.at(-1);
    return last?.type === "text"
      ? [...parts.slice(0, -1), { ...last, text: last.text + event.text }]
      : [...parts, { type: "text", text: event.text }];
  }
  if (event.type === "skill-active") {
    return [...parts, { type: "skill", name: event.name, description: event.description }];
  }
  if (event.type === "tool-start") {
    return [...parts, {
      type: "tool",
      server: event.server,
      tool: event.tool,
      arguments: event.arguments,
      result: "",
      status: "running",
    }];
  }
  if (event.type === "tool-result") {
    let index = -1;
    for (let candidate = parts.length - 1; candidate >= 0; candidate -= 1) {
      const part = parts[candidate];
      if (part?.type === "tool" && part.server === event.server
        && part.tool === event.tool && part.status === "running") {
        index = candidate;
        break;
      }
    }
    return parts.map((part, partIndex) =>
      partIndex === index && part.type === "tool"
        ? { ...part, result: event.result, status: "done" }
        : part,
    );
  }
  return event.type === "error"
    ? [...parts, { type: "error", message: event.message }]
    : parts;
};
