import crypto from "crypto";
import { db } from "./db";
import env from "./env";

/** 注册验证码 MongoDB 文档结构 */
type RegisterVerificationCodeDocument = {
  email: string;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  failedAttempts?: number;
};

const REGISTER_VERIFICATION_COLLECTION = "register_verification_codes";
/** 验证码长度（6 位数字） */
const REGISTER_VERIFICATION_CODE_LENGTH = 6;
/** 两次发送验证码的最小冷却间隔（秒） */
export const REGISTER_VERIFICATION_COOLDOWN_SECONDS = 60;
/** 验证码有效期（秒），10 分钟 */
export const REGISTER_VERIFICATION_EXPIRES_IN_SECONDS = 10 * 60;
/** 验证码最大错误尝试次数 */
const REGISTER_VERIFICATION_MAX_ATTEMPTS = 5;

let indexesEnsured = false;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** 获取注册验证码集合，首次访问时建立索引（含 TTL 过期索引） */
const getRegisterVerificationCollection = async () => {
  const mongoDb = await db;

  if (!mongoDb) {
    throw new Error("Database connection is not ready");
  }

  const collection = mongoDb.collection<RegisterVerificationCodeDocument>(
    REGISTER_VERIFICATION_COLLECTION,
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

/** 使用 SHA-256 哈希验证码，加入 'register' 命名空间以区别于其他验证码 */
const hashRegisterVerificationCode = (email: string, code: string) =>
  crypto
    .createHash("sha256")
    .update(`${env.BETTER_AUTH_SECRET}:register:${normalizeEmail(email)}:${code}`)
    .digest("hex");

/** 生成 6 位随机数字验证码 */
const generateRegisterVerificationCode = () =>
  crypto
    .randomInt(0, 10 ** REGISTER_VERIFICATION_CODE_LENGTH)
    .toString()
    .padStart(REGISTER_VERIFICATION_CODE_LENGTH, "0");

/** 注册验证码生成结果：成功返回验证码，冷却期内返回剩余秒数 */
type RegisterCodeIssueResult =
  | { success: true; code: string }
  | { success: false; remainingSeconds: number };

/** 生成并存储注册验证码，冷却期内拒绝重复发送 */
export const createRegisterVerificationCode = async (
  email: string,
): Promise<RegisterCodeIssueResult> => {
  const registerVerificationCollection =
    await getRegisterVerificationCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const latestCode = await registerVerificationCollection.findOne(
    {
      email: normalizedEmail,
      expiresAt: { $gt: now },
      usedAt: null,
    },
    { sort: { createdAt: -1 } },
  );

  if (latestCode) {
    const secondsSinceLastSend = Math.floor(
      (now.getTime() - latestCode.createdAt.getTime()) / 1000,
    );

    if (secondsSinceLastSend < REGISTER_VERIFICATION_COOLDOWN_SECONDS) {
      return {
        success: false as const,
        remainingSeconds:
          REGISTER_VERIFICATION_COOLDOWN_SECONDS - secondsSinceLastSend,
      };
    }
  }

  const code = generateRegisterVerificationCode();
  const expiresAt = new Date(
    now.getTime() + REGISTER_VERIFICATION_EXPIRES_IN_SECONDS * 1000,
  );

  await registerVerificationCollection.deleteMany({ email: normalizedEmail });
  await registerVerificationCollection.insertOne({
    email: normalizedEmail,
    codeHash: hashRegisterVerificationCode(normalizedEmail, code),
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

/** 校验并消费注册验证码：匹配成功返回 true，失败计入尝试次数 */
export const consumeRegisterVerificationCode = async (
  email: string,
  code: string,
): Promise<boolean> => {
  const registerVerificationCollection =
    await getRegisterVerificationCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const attemptFilter = {
    email: normalizedEmail,
    expiresAt: { $gt: now },
    usedAt: null,
    $or: [
      { failedAttempts: { $exists: false } },
      { failedAttempts: { $lt: REGISTER_VERIFICATION_MAX_ATTEMPTS } },
    ],
  };
  const record = await registerVerificationCollection.findOneAndUpdate(
    {
      ...attemptFilter,
      codeHash: hashRegisterVerificationCode(normalizedEmail, code),
    },
    { $set: { usedAt: now } },
    { returnDocument: "before" },
  );

  if (record) return true;

  const failedRecord = await registerVerificationCollection.findOneAndUpdate(
    attemptFilter,
    { $inc: { failedAttempts: 1 } },
    { returnDocument: "after", sort: { createdAt: -1 } },
  );
  if ((failedRecord?.failedAttempts ?? 0) >= REGISTER_VERIFICATION_MAX_ATTEMPTS) {
    await registerVerificationCollection.updateOne(
      { _id: failedRecord?._id, usedAt: null },
      { $set: { usedAt: now } },
    );
  }
  return false;
};

/** 注册完成后清除该邮箱的所有验证码记录 */
export const clearRegisterVerificationCodes = async (
  email: string,
): Promise<void> => {
  const registerVerificationCollection =
    await getRegisterVerificationCollection();

  await registerVerificationCollection.deleteMany({
    email: normalizeEmail(email),
  });
};
