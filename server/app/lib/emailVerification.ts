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
};

const EMAIL_VERIFICATION_COLLECTION = "email_verification_codes";
const EMAIL_VERIFICATION_CODE_LENGTH = 6;

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
  const emailVerificationCollection = await getEmailVerificationCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const record = await emailVerificationCollection.findOne({
    email: normalizedEmail,
    codeHash: hashVerificationCode(normalizedEmail, code),
    expiresAt: { $gt: now },
    usedAt: null,
  });

  if (!record) {
    return null;
  }

  const consumeResult = await emailVerificationCollection.updateOne(
    { email: normalizedEmail, codeHash: record.codeHash, usedAt: null },
    { $set: { usedAt: now } },
  );

  if (consumeResult.modifiedCount !== 1) {
    return null;
  }

  return record.token;
};
