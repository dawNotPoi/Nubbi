import "dotenv/config";
import { z } from "zod";

/** 将空字符串转为 undefined，避免空环境变量被当作有效值 */
const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmedValue = value.trim();
  return trimmedValue === "" ? undefined : trimmedValue;
};

/** 必填字符串环境变量，空值视为未设置 */
const requiredString = (name: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string({ required_error: `Missing required env var: ${name}` }).min(1),
  );

/** 可选字符串环境变量，空值视为未设置 */
const optionalString = () =>
  z.preprocess(emptyToUndefined, z.string().optional());

/** 可选数字环境变量，自动类型转换 */
const optionalNumber = () =>
  z.preprocess(emptyToUndefined, z.coerce.number().optional());

/** 有界整数环境变量，附带默认值和合法范围约束 */
const boundedInteger = (
  defaultValue: number,
  minimum: number,
  maximum: number,
) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(minimum).max(maximum).default(defaultValue),
  );

/** 端口号环境变量，自动类型转换并约束在 1-65535 范围 */
const portNumber = (name: string, defaultValue: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ invalid_type_error: `${name} must be a number` })
      .int()
      .min(1)
      .max(65535)
      .default(defaultValue),
  );

/** 可选布尔字符串（'true'/'false'），空值视为未设置 */
const optionalBooleanString = () =>
  z
    .preprocess((value) => {
      const nextValue = emptyToUndefined(value);
      return typeof nextValue === "string" ? nextValue.toLowerCase() : nextValue;
    }, z.enum(["true", "false"]).optional())
    .transform((value) => value === "true");

/** 所有环境变量的 Zod Schema，启动时检验并自动填充默认值 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: optionalString(),
  LOG_DB_QUERIES: optionalBooleanString(),
  MONGO_URI: requiredString("MONGO_URI"),
  MONGO_DB_NAME: optionalString().default("Nubbi"),
  SERVER_PORT: portNumber("SERVER_PORT", 4000),
  SOCKET_PORT: portNumber("SOCKET_PORT", 4040),
  TRUST_PROXY_HOPS: boundedInteger(0, 0, 5),
  BETTER_AUTH_SECRET: requiredString("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: requiredString("BETTER_AUTH_URL"),
  CLIENT_URL: optionalString().default("http://localhost:5173"),
  AUTH_GITHUB_ID: requiredString("AUTH_GITHUB_ID"),
  AUTH_GITHUB_SECRET: requiredString("AUTH_GITHUB_SECRET"),
  AUTH_GOOGLE_ID: optionalString(),
  AUTH_GOOGLE_SECRET: optionalString(),
  AUTH_GOOLE_ID: optionalString(),
  AUTH_GOOLE_SECRET: optionalString(),
  EMAIL_USER: requiredString("EMAIL_USER"),
  EMAIL_PASS: requiredString("EMAIL_PASS"),
  EMAIL_FROM: optionalString(),
  EMAIL_SERVICE: optionalString(),
  GH_IMAGE_REPO: optionalString(),
  GH_IMAGE_TOKEN: optionalString(),
  GH_IMAGE_BRANCH: optionalString(),
  GITHUB_IMAGE_REPO: optionalString(),
  GITHUB_IMAGE_TOKEN: optionalString(),
  GITHUB_IMAGE_BRANCH: optionalString(),
  SMTP_HOST: optionalString(),
  SMTP_PORT: optionalNumber(),
  SMTP_SECURE: optionalBooleanString(),
  FILE_UPLOAD_MAX_FILE_BYTES: optionalNumber().default(10 * 1024 ** 3),
  FILE_UPLOAD_USER_QUOTA_BYTES: optionalNumber().default(100 * 1024 ** 3),
  FILE_UPLOAD_MAX_ACTIVE_TASKS: optionalNumber().default(5),
  FILE_UPLOAD_TASK_TTL_HOURS: optionalNumber().default(24),
  IMAGE_UPLOAD_MAX_BYTES: boundedInteger(
    5 * 1024 ** 2,
    1024 ** 2,
    25 * 1024 ** 2,
  ),
});

const parsedEnv = envSchema.parse(process.env);

/** 聚合后的配置对象，包含旧字段兼容和默认值回填 */
const env = {
  ...parsedEnv,
  AUTH_GOOGLE_ID: parsedEnv.AUTH_GOOGLE_ID || parsedEnv.AUTH_GOOLE_ID || "",
  AUTH_GOOGLE_SECRET:
    parsedEnv.AUTH_GOOGLE_SECRET || parsedEnv.AUTH_GOOLE_SECRET || "",
  EMAIL_FROM: parsedEnv.EMAIL_FROM || parsedEnv.EMAIL_USER,
  GH_IMAGE_REPO: parsedEnv.GH_IMAGE_REPO || parsedEnv.GITHUB_IMAGE_REPO || "",
  GH_IMAGE_TOKEN: parsedEnv.GH_IMAGE_TOKEN || parsedEnv.GITHUB_IMAGE_TOKEN || "",
  GH_IMAGE_BRANCH:
    parsedEnv.GH_IMAGE_BRANCH ||
    parsedEnv.GITHUB_IMAGE_BRANCH ||
    "main",
};

if (!env.AUTH_GOOGLE_ID || !env.AUTH_GOOGLE_SECRET) {
  throw new Error(
    "Missing Google OAuth env vars. Please set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET."
  );
}

export default env;
