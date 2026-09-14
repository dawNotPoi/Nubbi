import crypto from "crypto";
import { db } from "./db";
import env from "./env";

type AccountDeletionCodeDocument = {
  userId: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  failedAttempts?: number;
};

const ACCOUNT_DELETION_COLLECTION = "account_deletion_codes";
const ACCOUNT_DELETION_CODE_LENGTH = 6;
export const ACCOUNT_DELETION_COOLDOWN_SECONDS = 60;
export const ACCOUNT_DELETION_EXPIRES_IN_SECONDS = 10 * 60;
const ACCOUNT_DELETION_MAX_ATTEMPTS = 5;

let indexesEnsured = false;

const getAccountDeletionCollection = async () => {
  const mongoDb = await db;

  if (!mongoDb) {
    throw new Error("Database connection is not ready");
  }

  const collection = mongoDb.collection<AccountDeletionCodeDocument>(
    ACCOUNT_DELETION_COLLECTION,
  );

  if (!indexesEnsured) {
    await collection.createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { email: 1, createdAt: -1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]);
    indexesEnsured = true;
  }

  return collection;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashDeletionCode = (userId: string, email: string, code: string) =>
  crypto
    .createHash("sha256")
    .update(
      `${env.BETTER_AUTH_SECRET}:delete-account:${userId}:${normalizeEmail(
        email,
      )}:${code}`,
    )
    .digest("hex");

const generateDeletionCode = () =>
  crypto
    .randomInt(0, 10 ** ACCOUNT_DELETION_CODE_LENGTH)
    .toString()
    .padStart(ACCOUNT_DELETION_CODE_LENGTH, "0");

export const createAccountDeletionCode = async ({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<
  | { success: true; code: string }
  | { success: false; remainingSeconds: number }
> => {
  const accountDeletionCollection = await getAccountDeletionCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const latestCode = await accountDeletionCollection.findOne(
    { userId, usedAt: null },
    { sort: { createdAt: -1 } },
  );

  if (latestCode) {
    const secondsSinceLastSend = Math.floor(
      (now.getTime() - latestCode.createdAt.getTime()) / 1000,
    );

    if (secondsSinceLastSend < ACCOUNT_DELETION_COOLDOWN_SECONDS) {
      return {
        success: false as const,
        remainingSeconds:
          ACCOUNT_DELETION_COOLDOWN_SECONDS - secondsSinceLastSend,
      };
    }
  }

  const code = generateDeletionCode();
  const expiresAt = new Date(
    now.getTime() + ACCOUNT_DELETION_EXPIRES_IN_SECONDS * 1000,
  );

  await accountDeletionCollection.deleteMany({ userId });
  await accountDeletionCollection.insertOne({
    userId,
    email: normalizedEmail,
    codeHash: hashDeletionCode(userId, normalizedEmail, code),
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

export const consumeAccountDeletionCode = async ({
  userId,
  email,
  code,
}: {
  userId: string;
  email: string;
  code: string;
}): Promise<boolean> => {
  const accountDeletionCollection = await getAccountDeletionCollection();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const attemptFilter = {
    userId,
    email: normalizedEmail,
    expiresAt: { $gt: now },
    usedAt: null,
    $or: [
      { failedAttempts: { $exists: false } },
      { failedAttempts: { $lt: ACCOUNT_DELETION_MAX_ATTEMPTS } },
    ],
  };
  const record = await accountDeletionCollection.findOneAndUpdate(
    {
      ...attemptFilter,
      codeHash: hashDeletionCode(userId, normalizedEmail, code),
    },
    { $set: { usedAt: now } },
    { returnDocument: "before" },
  );

  if (record) return true;

  const failedRecord = await accountDeletionCollection.findOneAndUpdate(
    attemptFilter,
    { $inc: { failedAttempts: 1 } },
    { returnDocument: "after", sort: { createdAt: -1 } },
  );
  if ((failedRecord?.failedAttempts ?? 0) >= ACCOUNT_DELETION_MAX_ATTEMPTS) {
    await accountDeletionCollection.updateOne(
      { _id: failedRecord?._id, usedAt: null },
      { $set: { usedAt: now } },
    );
  }
  return false;
};

export const clearAccountDeletionCodes = async (
  userId: string,
): Promise<void> => {
  const accountDeletionCollection = await getAccountDeletionCollection();
  await accountDeletionCollection.deleteMany({ userId });
};
