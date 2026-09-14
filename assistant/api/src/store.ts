import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "./env.js";
import type { Conversation, Message, MessagePart } from "./types.js";

const dataFile = path.join(projectRoot, "data", "conversations.json");

const readAll = async (): Promise<Conversation[]> => {
  const source = await readFile(dataFile, "utf8").catch(() => "[]");
  try {
    const value: unknown = JSON.parse(source);
    return Array.isArray(value) ? (value as Conversation[]) : [];
  } catch {
    return [];
  }
};

const writeAll = async (conversations: Conversation[]): Promise<void> => {
  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(conversations, null, 2), "utf8");
};

export const listConversations = async (): Promise<Omit<Conversation, "messages">[]> =>
  (await readAll())
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(({ messages: _messages, ...conversation }) => conversation);

export const createConversation = async (): Promise<Conversation> => {
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: randomUUID(),
    title: "新对话",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  const conversations = await readAll();
  conversations.push(conversation);
  await writeAll(conversations);
  return conversation;
};

export const getConversation = async (id: string): Promise<Conversation | null> =>
  (await readAll()).find((conversation) => conversation.id === id) ?? null;

export const deleteConversation = async (id: string): Promise<boolean> => {
  const conversations = await readAll();
  const next = conversations.filter((conversation) => conversation.id !== id);
  if (next.length === conversations.length) return false;
  await writeAll(next);
  return true;
};

export const appendMessage = async (
  id: string,
  role: Message["role"],
  parts: MessagePart[],
): Promise<Message> => {
  const conversations = await readAll();
  const conversation = conversations.find((item) => item.id === id);
  if (!conversation) throw new Error("对话不存在");
  const now = new Date().toISOString();
  const message = { id: randomUUID(), role, parts, createdAt: now };
  conversation.messages.push(message);
  conversation.updatedAt = now;
  if (role === "user" && conversation.messages.length === 1) {
    const text = parts.find((part) => part.type === "text");
    if (text?.type === "text") conversation.title = text.text.slice(0, 24);
  }
  await writeAll(conversations);
  return message;
};

export const setCodexThreadId = async (id: string, threadId: string): Promise<void> => {
  const conversations = await readAll();
  const conversation = conversations.find((item) => item.id === id);
  if (!conversation) throw new Error("对话不存在");
  conversation.codexThreadId = threadId;
  await writeAll(conversations);
};

export const clearCodexThreadIds = async (): Promise<void> => {
  const conversations = await readAll();
  conversations.forEach((conversation) => {
    delete conversation.codexThreadId;
  });
  await writeAll(conversations);
};

export const modelHistory = async (
  id: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> => {
  const conversation = await getConversation(id);
  if (!conversation) throw new Error("对话不存在");
  return conversation.messages.slice(-30).flatMap((message) => {
    const content = message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n");
    return content ? [{ role: message.role, content }] : [];
  });
};
