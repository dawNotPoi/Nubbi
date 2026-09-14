import { httpError } from "@/common/http-error";
import FileFolderStructureLock from "@/models/fileFolderStructureLock";
import { randomUUID } from "node:crypto";

const LEASE_MS = 60_000;
const WAIT_MS = 2_000;
const RETRY_MS = 40;

const wait = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, RETRY_MS));

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
      const lock = await FileFolderStructureLock.findOneAndUpdate(
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
  throw httpError(409, "文件夹结构正忙，请刷新后重试");
};

export const withFileFolderStructureLock = async <T>(
  userId: string,
  task: () => Promise<T>,
): Promise<T> => {
  const owner = randomUUID();
  await acquire(userId, owner);
  const renew = setInterval(() => {
    void FileFolderStructureLock.updateOne(
      { _id: userId, owner },
      { $set: { expiresAt: new Date(Date.now() + LEASE_MS) } },
    ).catch(() => undefined);
  }, LEASE_MS / 3);
  renew.unref();

  try {
    return await task();
  } finally {
    clearInterval(renew);
    await FileFolderStructureLock.deleteOne({ _id: userId, owner }).catch(
      () => undefined,
    );
  }
};
