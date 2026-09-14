import logger from "@/common/logger";
import mongoose from "mongoose";
import env from "./env";

const db = mongoose
  .connect(env.MONGO_URI, {
    dbName: env.MONGO_DB_NAME,
  })
  .then((res) => {
    logger.info("MonggoDB 连接成功");
    return res.connection.db;
  })
  .catch((err) => {
    throw err;
  });

// 非生产环境默认启用 Mongoose 查询日志
if (
  process.env.LOG_DB_QUERIES === "true" ||
  process.env.NODE_ENV !== "production"
) {
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
