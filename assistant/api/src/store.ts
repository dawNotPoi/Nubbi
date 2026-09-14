import { randomUUID } from "node:crypto";
import type { HydratedDocument } from "mongoose";
import {
  ConversationModel,
  type StoredConversation,
} from "./models/conversation.js";
import type { Conversation, Message, MessagePart } from "./types.js";

const toConversation = (document: HydratedDocument<StoredConversation>): Conversation => ({
  id: document.id,
  title: document.title,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  // 展开 messages 并复制 parts，避免调用方直接修改数据库文档对象。
  messages: document.messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [...message.parts] as MessagePart[],
    createdAt: message.createdAt,
  })),
  codexThreadId: document.codexThreadId,
});

/** 列出全部对话；省略消息内容，仅用于侧栏展示与选择。 */
export const listConversations = async (): Promise<Omit<Conversation, "messages">[]> => {
  const documents = await ConversationModel.find({}, { messages: 0 })
    .sort({ updatedAt: -1 })
    .exec();
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    codexThreadId: document.codexThreadId,
  }));
};

export const createConversation = async (): Promise<Conversation> => {
  const now = new Date().toISOString();
  const document = await ConversationModel.create({
    id: randomUUID(),
    title: "新对话",
    createdAt: now,
    updatedAt: now,
    messages: [],
  });
  return toConversation(document);
};

export const getConversation = async (id: string): Promise<Conversation | null> => {
  const document = await ConversationModel.findOne({ id }).exec();
  return document ? toConversation(document) : null;
};

export const deleteConversation = async (id: string): Promise<boolean> => {
  const result = await ConversationModel.deleteOne({ id }).exec();
  return result.deletedCount === 1;
};

export const appendMessage = async (
  id: string,
  role: Message["role"],
  parts: MessagePart[],
): Promise<Message> => {
  const now = new Date().toISOString();
  const message: Message = { id: randomUUID(), role, parts, createdAt: now };
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

export const setCodexThreadId = async (id: string, threadId: string): Promise<void> => {
  const result = await ConversationModel.updateOne({ id }, { $set: { codexThreadId: threadId } })
    .exec();
  if (!result.matchedCount) throw new Error("对话不存在");
};

export const clearCodexThreadIds = async (): Promise<void> => {
  await ConversationModel.updateMany(
    { codexThreadId: { $exists: true } },
    { $unset: { codexThreadId: 1 } },
  ).exec();
};
