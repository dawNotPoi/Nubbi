import type { Conversation, Message, MessagePart } from "../types.js";

const contextBudget = 60_000;    // 注入模型的上下文预算（字符数）
const toolResultLimit = 2_000;   // 工具结果截断长度
const omissionText = "[较早的对话内容因上下文预算已省略]";

export type AgentContextMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type AgentContext = {
  messages: AgentContextMessage[];
  truncated: boolean;
};

/**
 * 把消息中的各类 parts 渲染成模型可读的纯文本。
 * @param part 消息内容块，可能是文本 / Skill / 审批 / 工具执行 / 错误之一。
 * @returns 渲染后的纯文本摘要，用于拼装注入模型的上下文。
 */
const partText = (part: MessagePart): string => {
  if (part.type === "text") return part.text;
  if (part.type === "skill") return `[已激活 Skill：${part.name}]`;
  if (part.type === "approval") {
    return `[工具审批：${part.server}/${part.tool}，${part.approved ? "已允许" : "已拒绝"}]`;
  }
  if (part.type === "tool") {
    const status = part.success === false ? "失败" : "完成";
    return `[工具${status}：${part.server}/${part.tool}]\n${part.result.slice(0, toolResultLimit)}`;
  }
  return `[运行错误：${part.message}]`;
};

/**
 * 空消息（没有可渲染内容）返回 null，避免把无意义占位传给模型。
 * @param message 原始消息，包含角色与 parts 内容块。
 * @returns 转换后的上下文消息；无可渲染内容时返回 null。
 */
const toContextMessage = (message: Message): AgentContextMessage | null => {
  const content = message.parts.map(partText).filter(Boolean).join("\n\n").trim();
  return content ? { id: message.id, role: message.role, content } : null;
};

const sizeOf = (message: AgentContextMessage): number => message.content.length + 32;

/**
 * 构建注入模型的对话上下文。
 * 超过预算时：保留首条用户消息，从最新开始向前挑选放得下的消息，
 * 中间省略处插入占位说明，避免模型误解历史缺失。
 * @param conversation 完整对话，包含全部消息历史。
 * @returns 裁剪后的上下文消息列表与是否发生截断的标记。
 */
export const buildAgentContext = (conversation: Conversation): AgentContext => {
  const source = conversation.messages.flatMap((message) => {
    const converted = toContextMessage(message);
    return converted ? [converted] : [];
  });
  const total = source.reduce((size, message) => size + sizeOf(message), 0);
  if (total <= contextBudget) return { messages: source, truncated: false };

  const firstUser = source.find((message) => message.role === "user");
  const selected: AgentContextMessage[] = [];
  let remaining = contextBudget - omissionText.length - (firstUser ? sizeOf(firstUser) : 0);
  for (let index = source.length - 1; index >= 0; index -= 1) {
    const message = source[index];
    if (!message || message.id === firstUser?.id) continue;
    const size = sizeOf(message);
    if (size > remaining) continue;
    selected.unshift(message);
    remaining -= size;
  }
  const marker: AgentContextMessage = {
    id: "context-omitted",
    role: "assistant",
    content: omissionText,
  };
  return {
    messages: [...(firstUser ? [firstUser] : []), marker, ...selected],
    truncated: true,
  };
};

/**
 * 拼接 Codex 续接时的引导文本：历史上下文 + 当前请求。
 * 首次创建线程时使用，让 Codex 延续 Assistant 已保存的对话记忆。
 * @param context 已构建的对话上下文，历史消息按用户/助手区分渲染。
 * @param currentMessageId 当前用户消息的 ID，拼接历史时会排除它。
 * @param currentContent 当前用户请求的文本内容。
 * @returns 引导文本；没有历史时直接返回当前请求原文。
 */
export const renderCodexBootstrap = (
  context: AgentContext,
  currentMessageId: string,
  currentContent: string,
): string => {
  const history = context.messages.filter((message) => message.id !== currentMessageId)
    .map((message) => `${message.role === "user" ? "用户" : "助手"}：${message.content}`)
    .join("\n\n");
  if (!history) return currentContent;
  return [
    "以下是 Assistant 保存的既有对话上下文。请延续该上下文处理最后的当前请求。",
    history,
    `当前用户请求：${currentContent}`,
  ].join("\n\n");
};
