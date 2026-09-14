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
    await collection.createIndexes([
      { key: { email: 1, createdAt: -1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]);
    indexesEnsured = true;
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
