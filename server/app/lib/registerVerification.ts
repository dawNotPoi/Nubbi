import crypto from "crypto";
import { db } from "./db";
import env from "./env";

type RegisterVerificationCodeDocument = {
  email: string;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
};

const REGISTER_VERIFICATION_COLLECTION = "register_verification_codes";
const REGISTER_VERIFICATION_CODE_LENGTH = 6;
export const REGISTER_VERIFICATION_COOLDOWN_SECONDS = 60;
export const REGISTER_VERIFICATION_EXPIRES_IN_SECONDS = 10 * 60;

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
    indexesEnsured = true;
    await collection.createIndexes([
      { key: { email: 1, createdAt: -1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]);
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

export const createRegisterVerificationCode = async (email: string) => {
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
  });

  return {
    success: true as const,
    code,
  };
};

export const consumeRegisterVerificationCode = async (
  email: string,
  code: string,
) => {
  const registerVerificationCollection =
    await getRegisterVerificationCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const record = await registerVerificationCollection.findOne({
    email: normalizedEmail,
    codeHash: hashRegisterVerificationCode(normalizedEmail, code),
    expiresAt: { $gt: now },
    usedAt: null,
  });

  if (!record) {
    return false;
  }

  const consumeResult = await registerVerificationCollection.updateOne(
    { email: normalizedEmail, codeHash: record.codeHash, usedAt: null },
    { $set: { usedAt: now } },
  );

  return consumeResult.modifiedCount === 1;
};

export const clearRegisterVerificationCodes = async (email: string) => {
  const registerVerificationCollection =
    await getRegisterVerificationCollection();

  await registerVerificationCollection.deleteMany({
    email: normalizeEmail(email),
  });
};
