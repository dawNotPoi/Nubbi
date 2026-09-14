import { Schema } from "mongoose";
import { assistantConnection } from "../config/db.js";
import type { Conversation, Message } from "../types.js";

// parts 在数据库里存为 Mixed（任意 JSON），读取时再校验为 MessagePart[]。
export type StoredMessage = Omit<Message, "parts"> & { parts: unknown[] };
export type StoredConversation = Omit<Conversation, "messages"> & {
  messages: StoredMessage[];
};

// 内嵌消息文档：与对话同文档存储，避免额外集合与跨文档事务。
const messageSchema = new Schema<StoredMessage>({
  id: { type: String, required: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  parts: { type: [Schema.Types.Mixed], required: true },
  createdAt: { type: String, required: true },
}, { _id: false, id: false });

const conversationSchema = new Schema<StoredConversation>({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  createdAt: { type: String, required: true },
  // updatedAt 建索引：对话列表按它倒序排序。
  updatedAt: { type: String, required: true, index: true },
  messages: { type: [messageSchema], required: true, default: [] },
  codexThreadId: { type: String },
  tokenUsage: {
    type: new Schema({
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
      // prompt 缓存命中/未命中 token 数，Provider 未返回时缺省。
      promptCacheHitTokens: { type: Number },
      promptCacheMissTokens: { type: Number },
    }, { _id: false }),
  },
}, {
  collection: "conversations",
  id: false,
  versionKey: false,
});

export const ConversationModel = assistantConnection.model<StoredConversation>(
  "AssistantConversation",
  conversationSchema,
);
