import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import env from "./env";

// 为 better-auth 创建独立的数据库连接
const client = new MongoClient(env.MONGO_URI);
const db = client.db("dawn_notion");

export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: ["*"],
  emailAndPassword: {
    enabled: true,
    // requireEmailVerification: true, // 启用邮箱验证
    // sendVerificationEmail: true, // 启用验证邮件发送
    // sendPasswordResetEmail: true, // 启用密码重置邮件
    verificationTokenExpiresIn: 60 * 60 * 24, // 24小时
    passwordResetTokenExpiresIn: 60 * 60, // 1小时
  },
  account: {
    accountLinking: {
      enabled: true,
      // 选填：如果想要更严格，可以要求必须先验证邮箱才能合并
      // ensureEmailVerified: true,
    },
  },
  socialProviders: {
    github: {
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    },
    google: {
      clientId: env.AUTH_GOOLE_ID,
      clientSecret: env.AUTH_GOOLE_SECRET,
    },
  },
  accountLinking: {
    enabled: true,
    trustedProviders: ["google", "github", "email-password"],
    // requireEmailVerification: true, // 链接账户时也需要验证邮箱
    allowMultipleProviders: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7天
    updateAge: 60 * 60 * 24, // 1天更新一次
  },
  // 自定义邮件发送函数
  email: {
    sendVerificationEmail: async (email, token) => {
      return await sendVerificationEmail(email, token);
    },
    sendPasswordResetEmail: async (email, token) => {
      return await sendPasswordResetEmail(email, token);
    },
  },
});

export async function getUser(
  req: any
): Promise<{ id: string; email?: string; name?: string }> {
  if (req.user) return req.user;
  const session = await auth.api.getSession({ headers: req.headers as any });
  if (!session?.user)
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  req.user = session.user;
  return req.user;
}
