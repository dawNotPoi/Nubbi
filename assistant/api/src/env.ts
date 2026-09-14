import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

export const projectRoot = fileURLToPath(new URL("../..", import.meta.url));

// 优先加载 Assistant 项目根目录下的 .env。
dotenv.config({ path: path.join(projectRoot, ".env") });

/**
 * 从主服务端（server/.env）读取 MONGO_URI 作为兜底，
 * 让 Assistant API 能与主服务共享同一个 MongoDB 实例。
 */
const readServerMongoUri = (): string | undefined => {
  try {
    const values = dotenv.parse(readFileSync(path.join(projectRoot, "..", "server", ".env")));
    return values.MONGO_URI;
  } catch {
    // 主服务端 .env 缺失时不视为错误，由上方自己的 MONGO_URI 兜底。
    return undefined;
  }
};

// 空字符串视为未配置，避免用户留空后仍得到字符串值。
const optionalString = () =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

// 必填变量：为空同样视为缺失，并给出明确的环境变量名。
const requiredString = (name: string) => z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string({ required_error: `Missing required env var: ${name}` }).min(1),
);

const schema = z.object({
  // HTTP 监听端口，默认 8787。
  PORT: z.coerce.number().int().positive().default(8787),
  // MongoDB 连接串，优先用自身 env，其次回落到主服务端的配置。
  MONGO_URI: requiredString("MONGO_URI"),
  // Assistant 专属数据库名。
  ASSISTANT_MONGO_DB_NAME: optionalString().default("NubbiAssistant"),
  // 管理配置接口的访问密钥（模型 / MCP 设置）。
  CONFIG_ADMIN_TOKEN: optionalString(),
  // 兼容旧版的 MCP 配置密钥。
  MCP_CONFIG_TOKEN: optionalString(),
  // Codex CLI 可执行文件路径，缺省时按平台自动探测。
  CODEX_CLI_PATH: optionalString(),
});

export const env = schema.parse({
  ...process.env,
  MONGO_URI: process.env.MONGO_URI ?? readServerMongoUri(),
});
