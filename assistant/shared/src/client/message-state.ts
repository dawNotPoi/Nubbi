import { DELTA_PART_TYPES, type Message, type MessagePart, type StreamEvent } from "../contracts/index.ts";
import { applyUserInputEvent } from "../contracts/user-input-history.ts";

/** 工具的临时执行状态仅供客户端展示，不属于持久化消息协议。 */
export type ClientMessagePart = MessagePart extends infer Part
  ? Part extends { type: "tool" }
    ? Part & { status?: "running" | "done" }
    : Part
  : never;
/** 流式生成过程中展示的消息。 */
export type ClientMessage = Omit<Message, "parts"> & { parts: ClientMessagePart[] };

/**
 * 用一个事件更新消息内容，工具结果优先按 callId 精确定位。
 * @param messageParts 已展示的消息内容块。
 * @param event 服务端事件。
 * @returns 更新后的新数组，不修改输入。
 */
export function applyMessageEvent(messageParts: ClientMessagePart[], event: StreamEvent): ClientMessagePart[] {
  if (event.type === "user-input-request" || event.type === "user-input-resolved") return applyUserInputEvent(messageParts, event);
  if (event.type === "done") return event.message.parts;
  if (event.type === "text-delta" || event.type === "reasoning-delta") {
    const type = DELTA_PART_TYPES[event.type];
    const previousPart = messageParts.at(-1);
    return previousPart?.type === type
      ? [...messageParts.slice(0, -1), { ...previousPart, text: previousPart.text + event.text }]
      : [...messageParts, { type, text: event.text }];
  }
  if (event.type === "skill-active") {
    return [...messageParts, { type: "skill", name: event.name, description: event.description }];
  }
  if (event.type === "tool-start") {
    return [
      ...messageParts,
      {
        type: "tool",
        callId: event.callId,
        server: event.server,
        tool: event.tool,
        arguments: event.arguments,
        result: "",
        status: "running",
      },
    ];
  }
  if (event.type === "tool-result") {
    let matchingIndex = -1;
    for (let index = messageParts.length - 1; index >= 0; index -= 1) {
      const part = messageParts[index];
      if (part?.type !== "tool") continue;
      if (
        event.callId !== undefined
          ? part.callId === event.callId
          : part.status === "running" && part.server === event.server && part.tool === event.tool
      ) {
        matchingIndex = index;
        break;
      }
    }
    const resultFields = {
      result: event.result,
      success: event.success,
      durationMs: event.durationMs,
      status: "done" as const,
    };
    if (matchingIndex < 0)
      return [
        ...messageParts,
        { type: "tool", callId: event.callId, server: event.server, tool: event.tool, arguments: {}, ...resultFields },
      ];
    return messageParts.map((part, index) => (index === matchingIndex && part.type === "tool" ? { ...part, ...resultFields } : part));
  }
  return event.type === "error" ? [...messageParts, { type: "error", message: event.message }] : messageParts;
}

/**
 * 创建尚未落库的占位消息。
 * @param role 消息角色。
 * @param messageParts 初始内容。
 * @returns 临时消息。
 */
export function createPendingMessage(role: Message["role"], messageParts: ClientMessagePart[]): ClientMessage {
  return {
    id: `pending-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    parts: messageParts,
    createdAt: new Date().toISOString(),
  };
}
