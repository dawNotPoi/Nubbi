import mongoose from "mongoose";
import { env } from "./env.ts";

// 独立的连接实例：与主服务共享 Mongo 实例，但拥有专属连接池与库名，避免相互干扰。
/** Assistant 独立数据库连接，不复用主应用的模型注册表。 */
export const assistantConnection = mongoose.createConnection(env.MONGO_URI, {
  dbName: env.ASSISTANT_MONGO_DB_NAME,
  // 连接池适中：既保证并发读写的吞吐，又不占用过多数据库连接。
  maxPoolSize: 10,
  minPoolSize: 2,
  // 数据库不可用时快速失败，避免请求长期挂起。
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
  connectTimeoutMS: 10_000,
  retryWrites: true,
  retryReads: true,
  // 使用 admin 库认证，与主服务端保持一致。
  authSource: "admin",
});

/**
 * 等待连接就绪，供 Nest 生命周期钩子在监听端口前调用。
 * @returns 连接建立完成的 Promise；连接失败时抛出异常。
 */
export const connectAssistantDatabase = async (): Promise<void> => {
  await assistantConnection.asPromise();
  console.log(`Assistant MongoDB connected: ${env.ASSISTANT_MONGO_DB_NAME}`);
};
