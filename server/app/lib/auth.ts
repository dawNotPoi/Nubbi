import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { apiKey, bearer, jwt } from "better-auth/plugins";
import { AsyncLocalStorage } from "async_hooks";
import logger from "@/common/logger";
import { db } from "./db";
import { createEmailVerificationCode } from "./emailVerification";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { createPasswordResetCode } from "./passwordReset";
import env from "./env";
import { guardExternalApiKeyServerFields } from "./apiKeyRequestGuard";

const authDb = await db;
if (!authDb) {
  throw new Error("Database connection is not ready");
}

const serializeAuthLogArg = (value: unknown) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: value.cause,
    };
  }

  if (typeof value === "object" && value !== null) {
    return value;
  }

  return String(value);
};

const verifiedRegisterStorage = new AsyncLocalStorage<{ email: string }>();

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isVerifiedRegisterEmail = (email: string) => {
  const verifiedRegister = verifiedRegisterStorage.getStore();
  return verifiedRegister?.email === normalizeEmail(email);
};

export const auth = betterAuth({
  database: mongodbAdapter(authDb),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: [env.CLIENT_URL, env.BETTER_AUTH_URL],
  logger: {
    level: "debug",
    log(level, message, ...args) {
      const authArgs = args.map(serializeAuthLogArg);
      const msg = `[better-auth] ${message}`;

      if (level === "error") {
        logger.error(msg, ...authArgs);
      } else if (level === "warn") {
        logger.warn(msg, ...authArgs);
      } else {
        logger.info(msg, ...authArgs);
      }
    },
  },
  onAPIError: {
    errorURL: `${env.CLIENT_URL}/login`,
  },
  hooks: {
    before: guardExternalApiKeyServerFields,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    passwordResetTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, token }) => {
      const resetCode = await createPasswordResetCode(
        user.email,
        token,
        60 * 60,
      );
      const result = await sendPasswordResetEmail(user.email, resetCode);
      if (!result.success) {
        throw new Error("Failed to send password reset email");
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, token }) => {
      if (isVerifiedRegisterEmail(user.email)) {
        return;
      }

      const verificationCode = await createEmailVerificationCode(
        user.email,
        token,
        60 * 60 * 24,
      );
      const result = await sendVerificationEmail(user.email, verificationCode);
      if (!result.success) {
        throw new Error("Failed to send verification email");
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isVerifiedRegisterEmail(user.email)) {
            return;
          }

          return {
            data: {
              emailVerified: true,
            },
          };
        },
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  socialProviders: {
    github: {
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    },
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    },
  },
  accountLinking: {
    enabled: true,
    trustedProviders: ["google", "github", "email-password"],
    requireEmailVerification: true,
    allowMultipleProviders: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24 * 7,
  },
  plugins: [
    bearer(),
    jwt({
      jwt: {
        expirationTime: "15m",
      },
    }),
    apiKey({
      defaultPrefix: "nb_",
      enableMetadata: true,
      maximumNameLength: 100,
      // 必须关闭：默认行为会让带 x-api-key 的请求在所有 better-auth 端点伪造 session
      //（包括用 key 创建新 key、getSession 等），token 校验统一走 requireAuthWithApiKey
      disableSessionForAPIKeys: true,
      keyExpiration: {
        // 不传 expiresIn 时永不过期（"长期 token"语义）
        defaultExpiresIn: null,
      },
      rateLimit: {
        enabled: true,
        // 插件默认 10 次/天，对博客/MCP 场景远远不够，放宽为 300 次/分钟
        timeWindow: 60 * 1000,
        maxRequests: 300,
      },
    }),
  ],
});

export const signUpVerifiedEmailWithPassword = async ({
  email,
  password,
  name,
  headers,
}: {
  email: string;
  password: string;
  name: string;
  headers?: HeadersInit;
}) =>
  verifiedRegisterStorage.run(
    { email: normalizeEmail(email) },
    async () =>
      auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
          callbackURL: env.CLIENT_URL,
        },
        headers,
      }),
  );
