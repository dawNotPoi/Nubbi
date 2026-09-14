import crypto from "crypto";
import { db } from "./db";
import env from "./env";

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
const EMAIL_VERIFICATION_CODE_LENGTH = 6;
export const EMAIL_VERIFICATION_COOLDOWN_SECONDS = 60;
const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;

let indexesEnsured = false;

const getEmailVerificationCollection = async () => {
  const mongoDb = await db;

  if (!mongoDb) {
    throw new Error("Database connection is not ready");
  }

  const collection = mongoDb.collection<EmailVerificationCodeDocument>(
    EMAIL_VERIFICATION_COLLECTION,
  );

  if (!indexesEnsured) {
    indexesEnsured = true;
    await collection.createIndexes([
      { key: { email: 1, createdAt: -1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]);
  }

  return collection;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashVerificationCode = (email: string, code: string) =>
  crypto
    .createHash("sha256")
    .update(`${env.BETTER_AUTH_SECRET}:${normalizeEmail(email)}:${code}`)
    .digest("hex");

const generateVerificationCode = () =>
  crypto
    .randomInt(0, 10 ** EMAIL_VERIFICATION_CODE_LENGTH)
    .toString()
    .padStart(EMAIL_VERIFICATION_CODE_LENGTH, "0");

export const getEmailVerificationRemainingSeconds = async (email: string) => {
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

export const createEmailVerificationAttempt = async (email: string) => {
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
  });
};

export const createEmailVerificationCode = async (
  email: string,
  token: string,
  expiresInSeconds = 60 * 60 * 24,
) => {
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
  });

  return code;
};

export const consumeEmailVerificationCode = async (
  email: string,
  code: string,
) => {
  const collection = await getEmailVerificationCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const record = await collection.findOne({
    email: normalizedEmail,
    codeHash: { $ne: "" },
    expiresAt: { $gt: now },
    usedAt: null,
  });

  if (!record) return null;

  if ((record.failedAttempts ?? 0) >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
    return null;
  }

  if (record.codeHash !== hashVerificationCode(normalizedEmail, code)) {
    const newFailedAttempts = (record.failedAttempts ?? 0) + 1;
    const update: Record<string, unknown> = { failedAttempts: newFailedAttempts };
    if (newFailedAttempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      update.usedAt = now;
    }
    await collection.updateOne(
      { email: normalizedEmail, codeHash: record.codeHash, usedAt: null },
      { $set: update },
    );
    return null;
  }

  const consumeResult = await collection.updateOne(
    { email: normalizedEmail, codeHash: record.codeHash, usedAt: null },
    { $set: { usedAt: now } },
  );

  if (consumeResult.modifiedCount !== 1) return null;

  return record.token;
};
