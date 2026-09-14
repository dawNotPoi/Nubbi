import { countTokens, messageOverheadTokens } from "../runtime/tokens.ts";
import type { Conversation, Message, MessagePart } from "../types.ts";

const TOOL_RESULT_LIMIT = 2_000; // 工具结果截断长度
const OMISSION_TEXT = "[较早的对话内容因上下文预算已省略]";

/** 经预算裁剪后交给执行器的单条历史消息，不包含持久化细节。 */
export type AgentContextMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

/** 上下文裁剪结果及估算用量；估算不代表供应商实际计费。 */
export type AgentContext = {
  messages: AgentContextMessage[];
  truncated: boolean;
  usedTokens: number;
  maxTokens: number;
};

/**
 * 把消息中的各类 parts 渲染成模型可读的纯文本。
 * @param part 消息内容块，可能是文本 / Skill / 审批 / 工具执行 / 错误之一。
 * @returns 渲染后的纯文本摘要，用于拼装注入模型的上下文。
 */
const partText = (part: MessagePart): string => {
  if (part.type === "text") return part.text;
  // 推理内容只用于前端展示，不回灌给模型，避免泄露/干扰后续生成。
  if (part.type === "reasoning") return "";
  if (part.type === "skill") return `[已激活 Skill：${part.name}]`;
  if (part.type === "approval") {
    return `[工具审批：${part.server}/${part.tool}，${part.approved ? "已允许" : "已拒绝"}]`;
  }
  if (part.type === "tool") {
    const status = part.success === false ? "失败" : "完成";
    return `[工具${status}：${part.server}/${part.tool}]\n${part.result.slice(0, TOOL_RESULT_LIMIT)}`;
  }
  return `[运行错误：${part.message}]`;
};

/**
 * 空消息（没有可渲染内容）返回 null，避免把无意义占位传给模型。
 * @param message 原始消息，包含角色与 parts 内容块。
 * @returns 转换后的上下文消息；无可渲染内容时返回 null。
 */
const toContextMessage = (message: Message): AgentContextMessage | null => {
  const content = message.parts
    .map(partText)
    .filter(Boolean)
    .join("\n\n")
    .trim();
  return content ? { id: message.id, role: message.role, content } : null;
};

/** 估算单条上下文消息的 token 数（内容 + 固定开销）。 */
const messageTokens = (message: AgentContextMessage): number =>
  countTokens(message.content) + messageOverheadTokens;

/**
 * 构建注入模型的对话上下文。
 * 超过 token 预算时：保留首条用户消息，从最新开始向前挑选放得下的消息，
 * 中间省略处插入占位说明，避免模型误解历史缺失。返回裁剪后的上下文与占用比例。
 * @param conversation 完整对话，包含全部消息历史。
 * @param maxTokens 上下文 token 预算，默认 100_000。
 * @returns 裁剪后的上下文消息列表、是否截断以及 token 占用信息。
 */
export const buildAgentContext = (
  conversation: Conversation,
  maxTokens = 100_000,
): AgentContext => {
  const source = conversation.messages.flatMap((message) => {
    const converted = toContextMessage(message);
    return converted ? [converted] : [];
  });
  const usedTokens = source.reduce(
    (sum, message) => sum + messageTokens(message),
    0,
  );
  if (usedTokens <= maxTokens) {
    return { messages: source, truncated: false, usedTokens, maxTokens };
  }

  // 超预算：保留首条用户消息，从最新开始向前挑选放得下的消息。
  const firstUser = source.find((message) => message.role === "user");
  const selected: AgentContextMessage[] = [];
  let remaining =
    maxTokens -
    countTokens(OMISSION_TEXT) -
    (firstUser ? messageTokens(firstUser) : 0);
  for (let index = source.length - 1; index >= 0; index -= 1) {
    const message = source[index];
    if (!message || message.id === firstUser?.id) continue;
    const size = messageTokens(message);
    if (size > remaining) continue;
    selected.unshift(message);
    remaining -= size;
  }
  const marker: AgentContextMessage = {
    id: "context-omitted",
    role: "assistant",
    content: OMISSION_TEXT,
  };
  const messages = [...(firstUser ? [firstUser] : []), marker, ...selected];
  const trimmedTokens = messages.reduce(
    (sum, message) => sum + messageTokens(message),
    0,
  );
  return {
    messages,
    truncated: true,
    usedTokens: trimmedTokens,
    maxTokens,
  };
};
