import { httpError } from "@/common/http-error";
import NoteStructureLock from "@/models/noteStructureLock";
import { randomUUID } from "node:crypto";

const LEASE_MS = 60_000;
const WAIT_MS = 2_000;
const RETRY_MS = 40;

const wait = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, RETRY_MS));
};

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 11_000;

const acquire = async (userId: string, owner: string): Promise<void> => {
  const deadline = Date.now() + WAIT_MS;

  while (Date.now() < deadline) {
    const now = new Date();
    try {
      const lock = await NoteStructureLock.findOneAndUpdate(
        {
          _id: userId,
          $or: [{ expiresAt: { $lte: now } }, { owner }],
        },
        { $set: { owner, expiresAt: new Date(now.getTime() + LEASE_MS) } },
        { new: true, upsert: true },
      ).lean();
      if (lock) return;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
    await wait();
  }

  throw httpError(409, "Note hierarchy is busy; refresh and retry");
};

export const withNoteStructureLock = async <T>(
  userId: string,
  task: () => Promise<T>,
): Promise<T> => {
  const owner = randomUUID();
  await acquire(userId, owner);
  const renew = setInterval(() => {
    void NoteStructureLock.updateOne(
      { _id: userId, owner },
      { $set: { expiresAt: new Date(Date.now() + LEASE_MS) } },
    ).catch(() => undefined);
  }, LEASE_MS / 3);
  renew.unref();

  try {
    return await task();
  } finally {
    clearInterval(renew);
    await NoteStructureLock.deleteOne({ _id: userId, owner }).catch(
      () => undefined,
    );
  }
};
