import { Schema } from "mongoose";
import { assistantConnection } from "../db.js";
import type { Conversation, Message } from "../types.js";

export type StoredMessage = Omit<Message, "parts"> & { parts: unknown[] };
export type StoredConversation = Omit<Conversation, "messages"> & {
  messages: StoredMessage[];
};

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
  updatedAt: { type: String, required: true, index: true },
  messages: { type: [messageSchema], required: true, default: [] },
  codexThreadId: { type: String },
}, {
  collection: "conversations",
  id: false,
  versionKey: false,
});

export const ConversationModel = assistantConnection.model<StoredConversation>(
  "AssistantConversation",
  conversationSchema,
);
