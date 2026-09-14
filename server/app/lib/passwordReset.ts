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
};

const PASSWORD_RESET_COLLECTION = "password_reset_codes";
const PASSWORD_RESET_CODE_LENGTH = 6;

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

export const createPasswordResetCode = async (
  email: string,
  token: string,
  expiresInSeconds = 60 * 60,
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

export const consumePasswordResetCode = async (email: string, code: string) => {
  const passwordResetCollection = await getPasswordResetCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const record = await passwordResetCollection.findOne({
    email: normalizedEmail,
    codeHash: hashResetCode(normalizedEmail, code),
    expiresAt: { $gt: now },
    usedAt: null,
  });

  if (!record) {
    return null;
  }

  const consumeResult = await passwordResetCollection.updateOne(
    { email: normalizedEmail, codeHash: record.codeHash, usedAt: null },
    { $set: { usedAt: now } },
  );

  if (consumeResult.modifiedCount !== 1) {
    return null;
  }

  return record.token;
};
