import crypto from "crypto";
import { db } from "./db";
import env from "./env";

/** 邮箱验证码 MongoDB 文档结构 */
type EmailVerificationCodeDocument = {
  email: string;
  codeHash: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  failedAttempts?: number;
};

const EMAIL_VERIFICATION_COLLECTION = "email_verification_codes";
/** 验证码长度（6 位数字） */
const EMAIL_VERIFICATION_CODE_LENGTH = 6;
/** 两次发送验证码的最小间隔（秒） */
export const EMAIL_VERIFICATION_COOLDOWN_SECONDS = 60;
/** 验证码最大错误尝试次数，超过后失效 */
const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;

let indexesEnsured = false;

/** 获取邮箱验证码集合，首次访问时自动建立索引（包括 TTL 过期索引） */
const getEmailVerificationCollection = async () => {
  const mongoDb = await db;

  if (!mongoDb) {
    throw new Error("Database connection is not ready");
  }

  const collection = mongoDb.collection<EmailVerificationCodeDocument>(
    EMAIL_VERIFICATION_COLLECTION,
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

/** 标准化邮箱地址：去空格、转小写 */
const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** 使用 SHA-256 哈希验证码，防止数据库泄露时直接还原明文验证码 */
const hashVerificationCode = (email: string, code: string) =>
  crypto
    .createHash("sha256")
    .update(`${env.BETTER_AUTH_SECRET}:${normalizeEmail(email)}:${code}`)
    .digest("hex");

/** 生成 6 位随机数字验证码 */
const generateVerificationCode = () =>
  crypto
    .randomInt(0, 10 ** EMAIL_VERIFICATION_CODE_LENGTH)
    .toString()
    .padStart(EMAIL_VERIFICATION_CODE_LENGTH, "0");

/** 查询该邮箱距离上次发送验证码还剩多少冷却秒数（0 表示可立即发送） */
export const getEmailVerificationRemainingSeconds = async (
  email: string,
): Promise<number> => {
  const collection = await getEmailVerificationCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const latestCode = await collection.findOne(
    { email: normalizedEmail, usedAt: null },
    { sort: { createdAt: -1 } },
  );

  if (!latestCode) return 0;

  const secondsSinceLastSend = Math.floor(
    (now.getTime() - latestCode.createdAt.getTime()) / 1000,
  );

  return secondsSinceLastSend < EMAIL_VERIFICATION_COOLDOWN_SECONDS
    ? EMAIL_VERIFICATION_COOLDOWN_SECONDS - secondsSinceLastSend
    : 0;
};

/** 创建一次验证码发送尝试记录（仅占用冷却槽，不含验证码） */
export const createEmailVerificationAttempt = async (
  email: string,
): Promise<void> => {
  const collection = await getEmailVerificationCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (EMAIL_VERIFICATION_COOLDOWN_SECONDS + 10) * 1000,
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

/** 生成随机验证码，存储哈希值，返回明文（仅用于邮件发送） */
export const createEmailVerificationCode = async (
  email: string,
  token: string,
  expiresInSeconds = 60 * 60 * 24,
): Promise<string> => {
  const emailVerificationCollection = await getEmailVerificationCollection();
  const normalizedEmail = normalizeEmail(email);
  const code = generateVerificationCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

  await emailVerificationCollection.deleteMany({ email: normalizedEmail });
  await emailVerificationCollection.insertOne({
    email: normalizedEmail,
    codeHash: hashVerificationCode(normalizedEmail, code),
    token,
    expiresAt,
    createdAt: now,
    usedAt: null,
    failedAttempts: 0,
  });

  return code;
};

/** 校验并消费验证码：匹配成功返回关联的 Better Auth token，失败计入尝试次数 */
export const consumeEmailVerificationCode = async (
  email: string,
  code: string,
): Promise<string | null> => {
  const collection = await getEmailVerificationCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const attemptFilter = {
    email: normalizedEmail,
    codeHash: { $ne: "" },
    expiresAt: { $gt: now },
    usedAt: null,
    $or: [
      { failedAttempts: { $exists: false } },
      { failedAttempts: { $lt: EMAIL_VERIFICATION_MAX_ATTEMPTS } },
    ],
  };
  const record = await collection.findOneAndUpdate(
    {
      ...attemptFilter,
      codeHash: hashVerificationCode(normalizedEmail, code),
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
  if ((failedRecord?.failedAttempts ?? 0) >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
    await collection.updateOne(
      { _id: failedRecord?._id, usedAt: null },
      { $set: { usedAt: now } },
    );
  }
  return null;
};
