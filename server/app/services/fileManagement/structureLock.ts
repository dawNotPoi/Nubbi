import { httpError } from "@/common/http-error";
import FileFolderStructureLock from "@/models/fileFolderStructureLock";
import { randomUUID } from "node:crypto";

/** 锁租约时长（60 秒），超时后其他请求可抢占 */
const LEASE_MS = 60_000;
/** 最长等待锁的时间（2 秒） */
const WAIT_MS = 2_000;
/** 锁争用时重试间隔（40 毫秒） */
const RETRY_MS = 40;

/** 重试等待 */
const wait = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, RETRY_MS));

/** 判断是否为 MongoDB 唯一索引冲突（11000） */
const isDuplicateKey = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 11_000;

/** 尝试获取锁：抢占过期锁或已有锁，失败则等待重试直到超时 */
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

/** 在文件目录结构锁保护下执行任务，自动续租并在完成后释放 */
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
