import type { Conversation } from "../contracts/index.ts";
import type { ChatApi } from "./chat-api.ts";

/**
 * 准备消息所属会话；新会话和旧记录在首次发送时保存明确的模型。
 * @param input 会话接口、当前选择、请求模型与取消信号。
 * @returns 带持久化模型选择的会话副本，不修改已有状态对象。
 */
export async function prepareMessageConversation(input: {
  api: ChatApi; conversation: Conversation | null; model: string; signal: AbortSignal;
}): Promise<Conversation> {
  const conversation = input.conversation ?? await input.api.createConversation();
  input.signal.throwIfAborted();
  if (input.conversation?.model) return conversation;
  const saved = await input.api.updateConversationModel(conversation.id, input.model);
  input.signal.throwIfAborted();
  return { ...conversation, model: saved.model };
}
