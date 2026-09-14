import crypto from "crypto";
import { db } from "./db";
import env from "./env";

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
const PASSWORD_RESET_CODE_LENGTH = 6;
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
export const PASSWORD_RESET_EXPIRES_IN_SECONDS = 60 * 60;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

let indexesEnsured = false;

const getPasswordResetCollection = async () => {
  const mongoDb = await db;

  if (!mongoDb) {
    throw new Error("Database connection is not ready");
  }

  const collection = mongoDb.collection<PasswordResetCodeDocument>(
    PASSWORD_RESET_COLLECTION,
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

const hashResetCode = (email: string, code: string) =>
  crypto
    .createHash("sha256")
    .update(`${env.BETTER_AUTH_SECRET}:${normalizeEmail(email)}:${code}`)
    .digest("hex");

const generateResetCode = () =>
  crypto
    .randomInt(0, 10 ** PASSWORD_RESET_CODE_LENGTH)
    .toString()
    .padStart(PASSWORD_RESET_CODE_LENGTH, "0");

export const createPasswordResetAttempt = async (email: string) => {
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
  });
};

export const createPasswordResetCode = async (
  email: string,
  token: string,
  expiresInSeconds = PASSWORD_RESET_EXPIRES_IN_SECONDS,
) => {
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
  });

  return code;
};

export const getPasswordResetRemainingSeconds = async (email: string) => {
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

export const consumePasswordResetCode = async (email: string, code: string) => {
  const collection = await getPasswordResetCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const record = await collection.findOne({
    email: normalizedEmail,
    codeHash: { $ne: "" },
    expiresAt: { $gt: now },
    usedAt: null,
  });

  if (!record) return null;

  if ((record.failedAttempts ?? 0) >= PASSWORD_RESET_MAX_ATTEMPTS) {
    return null;
  }

  if (record.codeHash !== hashResetCode(normalizedEmail, code)) {
    const newFailedAttempts = (record.failedAttempts ?? 0) + 1;
    const update: Record<string, unknown> = { failedAttempts: newFailedAttempts };
    if (newFailedAttempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
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
