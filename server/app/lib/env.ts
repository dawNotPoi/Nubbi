import log from "@/common/chalk";
import "dotenv/config";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmedValue = value.trim();
  return trimmedValue === "" ? undefined : trimmedValue;
};

const requiredString = (name: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string({ required_error: `Missing required env var: ${name}` }).min(1),
  );

const optionalString = () =>
  z.preprocess(emptyToUndefined, z.string().optional());

const optionalNumber = () =>
  z.preprocess(emptyToUndefined, z.coerce.number().optional());

const optionalBooleanString = () =>
  z
    .preprocess((value) => {
      const nextValue = emptyToUndefined(value);
      return typeof nextValue === "string" ? nextValue.toLowerCase() : nextValue;
    }, z.enum(["true", "false"]).optional())
    .transform((value) => value === "true");

const envSchema = z.object({
  MONGO_URI: requiredString("MONGO_URI"),
  SERVER_PORT: requiredString("SERVER_PORT"),
  SOCKET_PORT: requiredString("SOCKET_PORT"),
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
});

const parsedEnv = envSchema.parse(process.env);

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

const maskValue = (value?: string) => (value ? "***" : "");

const envForLog = {
  ...env,
  MONGO_URI: maskValue(env.MONGO_URI),
  BETTER_AUTH_SECRET: maskValue(env.BETTER_AUTH_SECRET),
  AUTH_GITHUB_SECRET: maskValue(env.AUTH_GITHUB_SECRET),
  AUTH_GOOGLE_SECRET: maskValue(env.AUTH_GOOGLE_SECRET),
  AUTH_GOOLE_SECRET: maskValue(env.AUTH_GOOLE_SECRET),
  EMAIL_PASS: maskValue(env.EMAIL_PASS),
  GH_IMAGE_TOKEN: maskValue(env.GH_IMAGE_TOKEN),
  GITHUB_IMAGE_TOKEN: maskValue(env.GITHUB_IMAGE_TOKEN),
};

if (!env.AUTH_GOOGLE_ID || !env.AUTH_GOOGLE_SECRET) {
  throw new Error(
    "Missing Google OAuth env vars. Please set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET."
  );
}

log.success("环境变量加载成功", envForLog);

export default env;
