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
    await collection.createIndexes([
      { key: { email: 1, createdAt: -1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]);
    indexesEnsured = true;
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
