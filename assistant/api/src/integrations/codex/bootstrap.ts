import type { AgentContext } from "../../agent/context-builder.ts";

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
  const history = context.messages
    .filter((message) => message.id !== currentMessageId)
    .map((message) => `${message.role === "user" ? "用户" : "助手"}：${message.content}`)
    .join("\n\n");
  if (!history) return currentContent;
  return [
    "以下是 Assistant 保存的既有对话上下文。请延续该上下文处理最后的当前请求。",
    history,
    `当前用户请求：${currentContent}`,
  ].join("\n\n");
};
