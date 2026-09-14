import crypto from "crypto";
import { db } from "./db";
import env from "./env";

/** 账号注销验证码 MongoDB 文档结构 */
type AccountDeletionCodeDocument = {
  userId: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  failedAttempts?: number;
};

const ACCOUNT_DELETION_COLLECTION = "account_deletion_codes";
/** 验证码长度（6 位数字） */
const ACCOUNT_DELETION_CODE_LENGTH = 6;
/** 两次发送验证码的最小冷却间隔（秒） */
export const ACCOUNT_DELETION_COOLDOWN_SECONDS = 60;
/** 验证码有效期（秒），10 分钟 */
export const ACCOUNT_DELETION_EXPIRES_IN_SECONDS = 10 * 60;
/** 验证码最大错误尝试次数 */
const ACCOUNT_DELETION_MAX_ATTEMPTS = 5;

let indexesEnsured = false;

/** 获取账号注销验证码集合，首次访问时建立索引 */
const getAccountDeletionCollection = async () => {
  const mongoDb = await db;

  if (!mongoDb) {
    throw new Error("Database connection is not ready");
  }

  const collection = mongoDb.collection<AccountDeletionCodeDocument>(
    ACCOUNT_DELETION_COLLECTION,
  );

  if (!indexesEnsured) {
    await collection.createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { email: 1, createdAt: -1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]);
    indexesEnsured = true;
  }

  return collection;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** 使用 SHA-256 哈希验证码（含 userId 命名空间，防止跨账号复用） */
const hashDeletionCode = (userId: string, email: string, code: string) =>
  crypto
    .createHash("sha256")
    .update(
      `${env.BETTER_AUTH_SECRET}:delete-account:${userId}:${normalizeEmail(
        email,
      )}:${code}`,
    )
    .digest("hex");

/** 生成 6 位随机数字验证码 */
const generateDeletionCode = () =>
  crypto
    .randomInt(0, 10 ** ACCOUNT_DELETION_CODE_LENGTH)
    .toString()
    .padStart(ACCOUNT_DELETION_CODE_LENGTH, "0");

/** 生成并存储账号注销验证码，冷却期内拒绝重复发送 */
export const createAccountDeletionCode = async ({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<
  | { success: true; code: string }
  | { success: false; remainingSeconds: number }
> => {
  const accountDeletionCollection = await getAccountDeletionCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const latestCode = await accountDeletionCollection.findOne(
    { userId, usedAt: null },
    { sort: { createdAt: -1 } },
  );

  if (latestCode) {
    const secondsSinceLastSend = Math.floor(
      (now.getTime() - latestCode.createdAt.getTime()) / 1000,
    );

    if (secondsSinceLastSend < ACCOUNT_DELETION_COOLDOWN_SECONDS) {
      return {
        success: false as const,
        remainingSeconds:
          ACCOUNT_DELETION_COOLDOWN_SECONDS - secondsSinceLastSend,
      };
    }
  }

  const code = generateDeletionCode();
  const expiresAt = new Date(
    now.getTime() + ACCOUNT_DELETION_EXPIRES_IN_SECONDS * 1000,
  );

  await accountDeletionCollection.deleteMany({ userId });
  await accountDeletionCollection.insertOne({
    userId,
    email: normalizedEmail,
    codeHash: hashDeletionCode(userId, normalizedEmail, code),
    expiresAt,
    createdAt: now,
    usedAt: null,
    failedAttempts: 0,
  });

  return {
    success: true as const,
    code,
  };
};

/** 校验并消费账号注销验证码：成功返回 true，失败计入尝试次数 */
export const consumeAccountDeletionCode = async ({
  userId,
  email,
  code,
}: {
  userId: string;
  email: string;
  code: string;
}): Promise<boolean> => {
  const accountDeletionCollection = await getAccountDeletionCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const attemptFilter = {
    userId,
    email: normalizedEmail,
    expiresAt: { $gt: now },
    usedAt: null,
    $or: [
      { failedAttempts: { $exists: false } },
      { failedAttempts: { $lt: ACCOUNT_DELETION_MAX_ATTEMPTS } },
    ],
  };
  const record = await accountDeletionCollection.findOneAndUpdate(
    {
      ...attemptFilter,
      codeHash: hashDeletionCode(userId, normalizedEmail, code),
    },
    { $set: { usedAt: now } },
    { returnDocument: "before" },
  );

  if (record) return true;

  const failedRecord = await accountDeletionCollection.findOneAndUpdate(
    attemptFilter,
    { $inc: { failedAttempts: 1 } },
    { returnDocument: "after", sort: { createdAt: -1 } },
  );
  if ((failedRecord?.failedAttempts ?? 0) >= ACCOUNT_DELETION_MAX_ATTEMPTS) {
    await accountDeletionCollection.updateOne(
      { _id: failedRecord?._id, usedAt: null },
      { $set: { usedAt: now } },
    );
  }
  return false;
};

/** 注销完成后清除该用户的所有验证码记录 */
export const clearAccountDeletionCodes = async (
  userId: string,
): Promise<void> => {
  const accountDeletionCollection = await getAccountDeletionCollection();
  await accountDeletionCollection.deleteMany({ userId });
};
