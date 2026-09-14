import log from "@/common/chalk";
import mongoose from "mongoose";
import env from "./env";

const db = mongoose
  .connect(env.MONGO_URI, {
    dbName: env.MONGO_DB_NAME,
  })
  .then((res) => {
    log.success("MonggoDB 连接成功");
    return res.connection.db;
  })
  .catch((err) => {
    throw err;
  });

export { db };

export default mongoose;
