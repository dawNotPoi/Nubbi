import crypto from "crypto";
import { db } from "./db";
import env from "./env";

/** 密码重置验证码 MongoDB 文档结构 */
type PasswordResetCodeDocument = {
  email: string;
  codeHash: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  failedAttempts?: number;
};

const PASSWORD_RESET_COLLECTION = "password_reset_codes";
/** 验证码长度（6 位数字） */
const PASSWORD_RESET_CODE_LENGTH = 6;
/** 两次发送验证码的最小间隔（秒） */
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
/** 验证码默认有效期（秒），1 小时 */
export const PASSWORD_RESET_EXPIRES_IN_SECONDS = 60 * 60;
/** 验证码最大错误尝试次数 */
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

let indexesEnsured = false;

/** 获取密码重置验证码集合，首次访问时自动建立索引（包括 TTL 过期索引） */
const getPasswordResetCollection = async () => {
  const mongoDb = await db;

  if (!mongoDb) {
    throw new Error("Database connection is not ready");
  }

  const collection = mongoDb.collection<PasswordResetCodeDocument>(
    PASSWORD_RESET_COLLECTION,
  );

  if (!indexesEnsured) {
    await collection.createIndexes([
      { key: { email: 1, createdAt: -1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]);
    indexesEnsured = true;
  }

  return collection;
};

/** 标准化邮箱地址 */
const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** 使用 SHA-256 哈希验证码 */
const hashResetCode = (email: string, code: string) =>
  crypto
    .createHash("sha256")
    .update(`${env.BETTER_AUTH_SECRET}:${normalizeEmail(email)}:${code}`)
    .digest("hex");

/** 生成 6 位随机数字验证码 */
const generateResetCode = () =>
  crypto
    .randomInt(0, 10 ** PASSWORD_RESET_CODE_LENGTH)
    .toString()
    .padStart(PASSWORD_RESET_CODE_LENGTH, "0");

/** 创建一次密码重置尝试记录（不含验证码，仅占冷却槽） */
export const createPasswordResetAttempt = async (
  email: string,
): Promise<void> => {
  const collection = await getPasswordResetCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (PASSWORD_RESET_COOLDOWN_SECONDS + 10) * 1000,
  );

  await collection.deleteMany({ email: normalizedEmail });
  await collection.insertOne({
    email: normalizedEmail,
    codeHash: "",
    token: "",
    expiresAt,
    createdAt: now,
    usedAt: null,
    failedAttempts: 0,
  });
};

/** 生成随机密码重置验证码，存储哈希值，返回明文 */
export const createPasswordResetCode = async (
  email: string,
  token: string,
  expiresInSeconds = PASSWORD_RESET_EXPIRES_IN_SECONDS,
): Promise<string> => {
  const passwordResetCollection = await getPasswordResetCollection();
  const normalizedEmail = normalizeEmail(email);
  const code = generateResetCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

  await passwordResetCollection.deleteMany({ email: normalizedEmail });
  await passwordResetCollection.insertOne({
    email: normalizedEmail,
    codeHash: hashResetCode(normalizedEmail, code),
    token,
    expiresAt,
    createdAt: now,
    usedAt: null,
    failedAttempts: 0,
  });

  return code;
};

/** 查询该邮箱距离上次发送验证码还剩多少冷却秒数 */
export const getPasswordResetRemainingSeconds = async (
  email: string,
): Promise<number> => {
  const passwordResetCollection = await getPasswordResetCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const latestCode = await passwordResetCollection.findOne(
    { email: normalizedEmail, usedAt: null },
    { sort: { createdAt: -1 } },
  );

  if (!latestCode) {
    return 0;
  }

  const secondsSinceLastSend = Math.floor(
    (now.getTime() - latestCode.createdAt.getTime()) / 1000,
  );

  return secondsSinceLastSend < PASSWORD_RESET_COOLDOWN_SECONDS
    ? PASSWORD_RESET_COOLDOWN_SECONDS - secondsSinceLastSend
    : 0;
};

/** 校验并消费密码重置验证码：成功返回 Better Auth token，失败计入尝试并达到上限后作废 */
export const consumePasswordResetCode = async (
  email: string,
  code: string,
): Promise<string | null> => {
  const collection = await getPasswordResetCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const attemptFilter = {
    email: normalizedEmail,
    codeHash: { $ne: "" },
    expiresAt: { $gt: now },
    usedAt: null,
    $or: [
      { failedAttempts: { $exists: false } },
      { failedAttempts: { $lt: PASSWORD_RESET_MAX_ATTEMPTS } },
    ],
  };
  const record = await collection.findOneAndUpdate(
    {
      ...attemptFilter,
      codeHash: hashResetCode(normalizedEmail, code),
    },
    { $set: { usedAt: now } },
    { returnDocument: "before" },
  );
  if (record) return record.token;

  const failedRecord = await collection.findOneAndUpdate(
    attemptFilter,
    { $inc: { failedAttempts: 1 } },
    { returnDocument: "after", sort: { createdAt: -1 } },
  );
  if ((failedRecord?.failedAttempts ?? 0) >= PASSWORD_RESET_MAX_ATTEMPTS) {
    await collection.updateOne(
      { _id: failedRecord?._id, usedAt: null },
      { $set: { usedAt: now } },
    );
  }
  return null;
};
