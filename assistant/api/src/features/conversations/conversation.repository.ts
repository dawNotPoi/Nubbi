import { randomUUID } from "node:crypto";
import type { HydratedDocument } from "mongoose";
import { ConversationModel, type StoredConversation } from "./conversation.model.ts";
import type { Conversation, Message, MessagePart } from "../../types.ts";

/**
 * 将数据库文档转换为对外暴露的对话结构，并复制 parts 防止调用方修改库内对象。
 * @param document Mongoose 查询返回的对话文档。
 * @returns 对外安全的对话对象。
 */
const toConversation = (document: HydratedDocument<StoredConversation>): Conversation => ({
  id: document.id,
  title: document.title,
  model: document.model,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  // 展开 messages 并复制 parts，避免调用方直接修改数据库文档对象。
  messages: document.messages.map((message) => ({
    id: message.id,
    role: message.role,
    model: message.model,
    provider: message.provider,
    parts: [...message.parts] as MessagePart[],
    createdAt: message.createdAt,
  })),
  codexThreadId: document.codexThreadId,
  tokenUsage: document.tokenUsage
    ? {
        promptTokens: document.tokenUsage.promptTokens ?? 0,
        completionTokens: document.tokenUsage.completionTokens ?? 0,
        totalTokens: document.tokenUsage.totalTokens ?? 0,
        promptCacheHitTokens: document.tokenUsage.promptCacheHitTokens,
        promptCacheMissTokens: document.tokenUsage.promptCacheMissTokens,
      }
    : undefined,
});

/**
 * 列出全部对话；省略消息内容，仅用于侧栏展示与选择。
 * @returns 不含消息内容的对话列表，按更新时间倒序。
 */
export const listConversations = async (): Promise<Omit<Conversation, "messages">[]> => {
  const documents = await ConversationModel.find({}, { messages: 0 }).sort({ updatedAt: -1 }).exec();
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    model: document.model,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    codexThreadId: document.codexThreadId,
    tokenUsage: document.tokenUsage
      ? {
          promptTokens: document.tokenUsage.promptTokens ?? 0,
          completionTokens: document.tokenUsage.completionTokens ?? 0,
          totalTokens: document.tokenUsage.totalTokens ?? 0,
          promptCacheHitTokens: document.tokenUsage.promptCacheHitTokens,
          promptCacheMissTokens: document.tokenUsage.promptCacheMissTokens,
        }
      : undefined,
  }));
};

/**
 * 创建一个标题为“新对话”的空对话。
 * @param model 新会话的默认模型快照。
 * @returns 新建的对话对象。
 */
export const createConversation = async (model: string): Promise<Conversation> => {
  const now = new Date().toISOString();
  const document = await ConversationModel.create({
    id: randomUUID(),
    title: "新对话",
    model,
    createdAt: now,
    updatedAt: now,
    messages: [],
  });
  return toConversation(document);
};

/**
 * 按 ID 获取对话。
 * @param id 对话的唯一 ID。
 * @returns 对话对象；不存在时返回 null。
 */
export const getConversation = async (id: string): Promise<Conversation | null> => {
  const document = await ConversationModel.findOne({ id }).exec();
  return document ? toConversation(document) : null;
};

/**
 * 按 ID 删除对话。
 * @param id 对话的唯一 ID。
 * @returns 是否确实删除了对话。
 */
export const deleteConversation = async (id: string): Promise<boolean> => {
  const result = await ConversationModel.deleteOne({ id }).exec();
  return result.deletedCount === 1;
};

/**
 * 向对话追加一条消息；首条用户消息会截取前 24 字符作为对话标题。
 * @param id 对话的唯一 ID。
 * @param role 消息角色（用户或助手）。
 * @param parts 消息内容块列表。
 * @param execution 本次运行的模型信息；兼容未记录模型的旧调用。
 * @returns 新追加的消息；对话不存在时抛出异常。
 */
export const appendMessage = async (
  id: string, role: Message["role"], parts: MessagePart[], execution: Pick<Message, "model" | "provider"> = {},
): Promise<Message> => {
  const now = new Date().toISOString();
  const message: Message = { id: randomUUID(), role, parts, createdAt: now, ...execution };
  // 先插入消息再读取，若对话不存在则直接失败。
  const previous = await ConversationModel.findOneAndUpdate(
    { id },
    { $push: { messages: message }, $set: { updatedAt: now } },
    { new: false },
  ).exec();
  if (!previous) throw new Error("对话不存在");
  // 首条用户消息作为对话标题，截取前 24 个字符作为简短标题。
  if (role === "user" && previous.messages.length === 0) {
    const text = parts.find((part) => part.type === "text");
    if (text?.type === "text") {
      await ConversationModel.updateOne({ id }, { $set: { title: text.text.slice(0, 24) } }).exec();
    }
  }
  return message;
};

/**
 * 保存对话关联的 Codex 订阅线程 ID，并记录创建线程时的动态工具签名。
 * @param id 对话的唯一 ID。
 * @param threadId Codex 线程 ID。
 * @param toolSignature 创建线程时的工具签名，缺省时不更新。
 * @returns 无返回值；对话不存在时抛出异常。
 */
export const setCodexThreadId = async (id: string, threadId: string, toolSignature?: string): Promise<void> => {
  const update: Record<string, string> = { codexThreadId: threadId };
  if (toolSignature !== undefined) update.codexToolSignature = toolSignature;
  const result = await ConversationModel.updateOne({ id }, { $set: update }).exec();
  if (!result.matchedCount) throw new Error("对话不存在");
};

/**
 * 累计对话的 token 用量（prompt/completion/total 与缓存 token 各自累加）。
 * 缓存字段缺失时跳过 $inc，避免把 undefined 写入数据库。
 * @param id 对话的唯一 ID。
 * @param usage 本次 Run 的用量增量。
 * @returns 无返回值；对话不存在时抛出异常。
 */
export const accumulateTokenUsage = async (
  id: string,
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    promptCacheHitTokens?: number;
    promptCacheMissTokens?: number;
  },
): Promise<void> => {
  const increment: Record<string, number> = {
    "tokenUsage.promptTokens": usage.promptTokens,
    "tokenUsage.completionTokens": usage.completionTokens,
    "tokenUsage.totalTokens": usage.totalTokens,
  };
  if (usage.promptCacheHitTokens !== undefined) {
    increment["tokenUsage.promptCacheHitTokens"] = usage.promptCacheHitTokens;
  }
  if (usage.promptCacheMissTokens !== undefined) {
    increment["tokenUsage.promptCacheMissTokens"] = usage.promptCacheMissTokens;
  }
  const result = await ConversationModel.updateOne({ id }, { $inc: increment }).exec();
  if (!result.matchedCount) throw new Error("对话不存在");
};

/**
 * 清空所有对话的 Codex 线程 ID，用于配置变更后强制下一轮重新建线程。
 * @returns 无返回值。
 */
export const clearCodexThreadIds = async (): Promise<void> => {
  await ConversationModel.updateMany({ codexThreadId: { $exists: true } }, { $unset: { codexThreadId: 1 } }).exec();
};
