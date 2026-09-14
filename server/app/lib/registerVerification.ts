import crypto from "crypto";
import { db } from "./db";
import env from "./env";

type RegisterVerificationCodeDocument = {
  email: string;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  failedAttempts?: number;
};

const REGISTER_VERIFICATION_COLLECTION = "register_verification_codes";
const REGISTER_VERIFICATION_CODE_LENGTH = 6;
export const REGISTER_VERIFICATION_COOLDOWN_SECONDS = 60;
export const REGISTER_VERIFICATION_EXPIRES_IN_SECONDS = 10 * 60;
const REGISTER_VERIFICATION_MAX_ATTEMPTS = 5;

let indexesEnsured = false;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

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

const hashRegisterVerificationCode = (email: string, code: string) =>
  crypto
    .createHash("sha256")
    .update(`${env.BETTER_AUTH_SECRET}:register:${normalizeEmail(email)}:${code}`)
    .digest("hex");

const generateRegisterVerificationCode = () =>
  crypto
    .randomInt(0, 10 ** REGISTER_VERIFICATION_CODE_LENGTH)
    .toString()
    .padStart(REGISTER_VERIFICATION_CODE_LENGTH, "0");

type RegisterCodeIssueResult =
  | { success: true; code: string }
  | { success: false; remainingSeconds: number };

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

export const clearRegisterVerificationCodes = async (
  email: string,
): Promise<void> => {
  const registerVerificationCollection =
    await getRegisterVerificationCollection();

  await registerVerificationCollection.deleteMany({
    email: normalizeEmail(email),
  });
};
