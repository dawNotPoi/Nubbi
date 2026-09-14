import { ConversationModel } from "./conversation.model.ts";

/**
 * 只保存会话下次使用的模型，不影响已经创建的 Run 或历史消息。
 * @param conversationId 会话 ID。
 * @param model 明确选择的模型 ID。
 * @returns 是否找到并更新会话。
 */
export async function saveConversationModel(conversationId: string, model: string): Promise<boolean> {
  const result = await ConversationModel.updateOne({ id: conversationId }, { $set: { model } }).exec();
  return result.matchedCount === 1;
}
