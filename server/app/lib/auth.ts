import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import logger from "@/common/logger";
import { db } from "./db";
import { createEmailVerificationCode } from "./emailVerification";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { createPasswordResetCode } from "./passwordReset";
import env from "./env";
import { guardExternalApiKeyServerFields } from "./apiKeyRequestGuard";
import {
  authDatabaseHooks,
  isVerifiedRegisterEmail,
  runWithVerifiedRegisterEmail,
} from "./auth-database-hooks";
import {
  sanitizeAuthLogMessage,
  serializeAuthLogArg,
} from "./auth-logging";
import { resolveAuthTrustedOrigins } from "./trusted-origins";
import {
  createAuthPlugins,
  normalizeAuthJwtAuthority,
} from "./auth-plugins";
import { assertAuthDatabaseReady } from "@/services/auth/auth-database-readiness";

const authDb = await db;
if (!authDb) {
  throw new Error("Database connection is not ready");
}

/** JWT 签发与校验共享的标准化 issuer/audience。 */
export const authJwtAuthority = normalizeAuthJwtAuthority(
  env.BETTER_AUTH_URL,
);
const authPlugins = createAuthPlugins(authJwtAuthority);
await assertAuthDatabaseReady(authDb, { plugins: authPlugins });

export const auth = betterAuth({
  database: mongodbAdapter(authDb),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: authJwtAuthority,
  basePath: "/api/auth",
  trustedOrigins: resolveAuthTrustedOrigins,
  logger: {
    level: env.NODE_ENV === "production" ? "warn" : "debug",
    log(level, message, ...args) {
      const authArgs = args.map(serializeAuthLogArg);
      const msg = `[better-auth] ${sanitizeAuthLogMessage(message)}`;

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
    revokeSessionsOnPasswordReset: true,
    // better-auth 默认即 8，显式声明以与路由层校验（注册/重置"至少 8 位"）保持同步
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
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
  databaseHooks: authDatabaseHooks,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github", "email-password"],
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
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24 * 7,
  },
  plugins: authPlugins,
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
}): Promise<Awaited<ReturnType<typeof auth.api.signUpEmail>>> =>
  runWithVerifiedRegisterEmail(
    email,
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
