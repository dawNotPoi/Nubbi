import { trackCurrentAccountMutation } from "@/middleware/account-mutation";
import { AsyncLocalStorage } from "async_hooks";
import type {
  Account,
  Session,
  User,
  Verification,
} from "better-auth";

/** 用于标记"已验证注册"的邮箱，跳过 Better Auth 的二次验证邮件发送 */
const verifiedRegisterStorage = new AsyncLocalStorage<{ email: string }>();
const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

/** 判断当前是否处于"已验证注册"上下文 */
export const isVerifiedRegisterEmail = (email: string): boolean =>
  verifiedRegisterStorage.getStore()?.email === normalizeEmail(email);

/** 在"已验证注册"上下文中执行操作，自动设置 emailVerified */
export const runWithVerifiedRegisterEmail = <Result>(
  email: string,
  operation: () => Promise<Result>,
): Promise<Result> =>
  verifiedRegisterStorage.run(
    { email: normalizeEmail(email) },
    operation,
  );

/** 保护账号数据写入：在 account-mutation 互斥锁的保护下执行 */
const protectAccountDataWrite = (userId?: string): void => {
  if (userId) trackCurrentAccountMutation(userId);
};

/** Better Auth 数据库钩子：验证注册、账号写入互斥保护 */
export const authDatabaseHooks = {
  user: {
    create: {
      before: async (user: User) => {
        if (!isVerifiedRegisterEmail(user.email)) return;
        return { data: { emailVerified: true } };
      },
    },
  },
  session: {
    create: {
      before: async (session: Session) =>
        protectAccountDataWrite(session.userId),
    },
  },
  account: {
    create: {
      before: async (account: Account) =>
        protectAccountDataWrite(account.userId),
    },
  },
  verification: {
    create: {
      before: async (verification: Verification) => {
        if (verification.identifier.startsWith("reset-password:")) {
          protectAccountDataWrite(verification.value);
        }
      },
    },
  },
};
