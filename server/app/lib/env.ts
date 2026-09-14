import log from "@/common/chalk";
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  MONGO_URI: z.string(),
  SERVER_PORT: z.string(),
  SOCKET_PORT: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),
  CLIENT_URL: z.string().optional().default("http://localhost:5173"),
  AUTH_GITHUB_ID: z.string(),
  AUTH_GITHUB_SECRET: z.string(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_GOOLE_ID: z.string().optional(),
  AUTH_GOOLE_SECRET: z.string().optional(),
  EMAIL_USER: z.string(),
  EMAIL_PASS: z.string(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_SERVICE: z.string().optional(),
  AI_CONFIG_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

const parsedEnv = envSchema.parse(process.env);

const env = {
  ...parsedEnv,
  AUTH_GOOGLE_ID: parsedEnv.AUTH_GOOGLE_ID || parsedEnv.AUTH_GOOLE_ID || "",
  AUTH_GOOGLE_SECRET:
    parsedEnv.AUTH_GOOGLE_SECRET || parsedEnv.AUTH_GOOLE_SECRET || "",
  EMAIL_FROM: parsedEnv.EMAIL_FROM || parsedEnv.EMAIL_USER,
};

if (!env.AUTH_GOOGLE_ID || !env.AUTH_GOOGLE_SECRET) {
  throw new Error(
    "Missing Google OAuth env vars. Please set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET."
  );
}

log.success("环境变量加载成功", {
  ...env,
  EMAIL_PASS: env.EMAIL_PASS ? "***" : "",
  BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET ? "***" : "",
  AUTH_GITHUB_SECRET: env.AUTH_GITHUB_SECRET ? "***" : "",
  AUTH_GOOGLE_SECRET: env.AUTH_GOOGLE_SECRET ? "***" : "",
});

export default env;
