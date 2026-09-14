import log from "@/common/chalk";
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  MONGO_URI: z.string(),
  SERVER_PORT: z.string(),
  SOCKET_PORT: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),
  // Frontend base url (used for auth redirects)
  CLIENT_URL: z.string().optional().default("http://localhost:5173"),
  // Override better-auth error redirect url (absolute or path relative to CLIENT_URL)
  BETTER_AUTH_ERROR_URL: z.string().optional(),
  AUTH_GITHUB_ID: z.string(),
  AUTH_GITHUB_SECRET: z.string(),
  AUTH_GOOLE_ID: z.string(),
  AUTH_GOOLE_SECRET: z.string(),
  EMAIL_USER: z.string(),
  EMAIL_PASS: z.string(),
});

const env = envSchema.parse(process.env);
log.success("环境变量加载成功", env);
export default env;
