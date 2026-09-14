import mongoose from "mongoose";
import { env } from "./env.js";

export const assistantConnection = mongoose.createConnection(env.MONGO_URI, {
  dbName: env.ASSISTANT_MONGO_DB_NAME,
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
  connectTimeoutMS: 10_000,
  retryWrites: true,
  retryReads: true,
  authSource: "admin",
});

export const connectAssistantDatabase = async (): Promise<void> => {
  await assistantConnection.asPromise();
  console.log(`Assistant MongoDB connected: ${env.ASSISTANT_MONGO_DB_NAME}`);
};
