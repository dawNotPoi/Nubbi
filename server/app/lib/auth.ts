import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { bearer } from "better-auth/plugins";
import { AsyncLocalStorage } from "async_hooks";
import log from "@/common/chalk";
import { db } from "./db";
import { createEmailVerificationCode } from "./emailVerification";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { createPasswordResetCode } from "./passwordReset";
import env from "./env";

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
      const prefixedMessage = `[better-auth:${level}] ${message}`;

      if (level === "error") {
        log.error(prefixedMessage, ...authArgs);
        return;
      }

      if (level === "warn") {
        log.warn(prefixedMessage, ...authArgs);
        return;
      }

      log.info(prefixedMessage, ...authArgs);
    },
  },
  onAPIError: {
    errorURL: `${env.CLIENT_URL}/login`,
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
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [bearer()],
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

export async function getUser(
  req: any,
): Promise<{ id: string; email?: string; name?: string }> {
  if (req.user) return req.user;
  const session = await auth.api.getSession({ headers: req.headers as any });
  if (!session?.user) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  req.user = session.user;
  return req.user;
}
