import { type Db } from "mongodb";
import logger from "@/common/logger";
import mongoose from "mongoose";
import env from "./env";

/** 连接失败后的基础重试间隔（毫秒），按指数退避递增 */
const RETRY_BASE_DELAY_MS = 2000;
/** 重试间隔上限（毫秒），避免退避时间无限增长 */
const MAX_RETRY_DELAY_MS = 30000;

/**
 * 等待指定时长，用于重连退避。
 * @param ms 等待时长（毫秒）。
 * @returns 无返回值。
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// 连接建立后的异常事件兜底：只记录日志，避免连接池抖动导致进程崩溃
mongoose.connection.on("error", (error) => {
  logger.error("MongoDB 连接异常", { error: error.message });
});
mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB 连接已断开，驱动会自动尝试重连");
});
mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB 已重新连接");
});

/**
 * 连接 MongoDB，失败时按指数退避自动重试。
 * 远程数据库经代理访问时握手可能偶发失败，重试可避免进程启动即崩溃。
 * @returns 连接成功后的数据库实例。
 */
const connectWithRetry = async (): Promise<Db | undefined> => {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      const connection = await mongoose.connect(env.MONGO_URI, {
        dbName: env.MONGO_DB_NAME,
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
        authSource: "admin",
      });
      logger.info("MonggoDB 连接成功");
      return connection.connection.db;
    } catch (error) {
      const delay = Math.min(
        RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
        MAX_RETRY_DELAY_MS,
      );
      logger.error(
        `MongoDB 连接失败（第 ${attempt} 次），${Math.round(delay / 1000)} 秒后重试`,
        { error: error instanceof Error ? error.message : String(error) },
      );
      await sleep(delay);
    }
  }
};

const db = connectWithRetry();

/** 非生产环境默认启用 Mongoose 查询日志，便于调试数据库操作 */
if (env.LOG_DB_QUERIES || env.NODE_ENV !== "production") {
  mongoose.set(
    "debug",
    (collectionName: string, methodName: string, ...args: unknown[]) => {
      logger.debug(`[DB] ${collectionName}.${methodName}`, {
        collection: collectionName,
        method: methodName,
        args: args.slice(0, 2).map((a) =>
          typeof a === "object" ? "[Object]" : a,
        ),
      });
    },
  );
}

export { db };

export default mongoose;
