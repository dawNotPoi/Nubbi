import { trackCurrentAccountMutation } from "@/middleware/account-mutation";
import { AsyncLocalStorage } from "async_hooks";
import type {
  Account,
  Session,
  User,
  Verification,
} from "better-auth";

const verifiedRegisterStorage = new AsyncLocalStorage<{ email: string }>();
const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const isVerifiedRegisterEmail = (email: string): boolean =>
  verifiedRegisterStorage.getStore()?.email === normalizeEmail(email);

export const runWithVerifiedRegisterEmail = <Result>(
  email: string,
  operation: () => Promise<Result>,
): Promise<Result> =>
  verifiedRegisterStorage.run(
    { email: normalizeEmail(email) },
    operation,
  );

const protectAccountDataWrite = (userId?: string): void => {
  if (userId) trackCurrentAccountMutation(userId);
};

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
