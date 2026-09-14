import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

// 从 src/config/env.ts 上溯三级得到 assistant 项目根目录（api → src → config）。
/** Assistant 运行根目录，用于解析本地配置和技能路径。 */
export const projectRoot = fileURLToPath(new URL("../../..", import.meta.url));

// 优先加载 Assistant 项目根目录下的 .env。
dotenv.config({ path: path.join(projectRoot, ".env") });

// 空字符串视为未配置，避免用户留空后仍得到字符串值。
const optionalString = () => z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

// 必填变量：为空同样视为缺失，并给出明确的环境变量名。
const requiredString = (name: string) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string({ required_error: `Missing required env var: ${name}` }).min(1),
  );

const schema = z.object({
  // 本地未设置时保留源码定位；生产环境显式设置 production 以关闭采集。
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  // HTTP 监听端口，默认 8787。
  PORT: z.coerce.number().int().positive().default(8787),
  // MongoDB 连接串必须显式配置，不读取主服务配置或使用默认地址。
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

/** 经过校验的服务运行配置，密钥仅在服务端使用。 */
export const env = schema.parse({
  ...process.env,
  MONGO_URI: process.env.MONGO_URI?.trim(),
});
