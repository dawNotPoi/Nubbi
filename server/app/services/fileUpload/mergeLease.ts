import logger from "@/common/logger";
import { UploadTask } from "@/models/file/uploadTask";
import { fileUploadConfig } from "./config";
import { getActiveUploadTaskGuard } from "./taskPolicy";

/** 合并租约时长（5 分钟），防止合并进程崩溃后任务卡死 */
export const MERGE_LEASE_MS = 5 * 60 * 1000;

/** 计算租约到期时间 */
export const getMergeLeaseExpiry = (now: Date): Date =>
  new Date(now.getTime() + MERGE_LEASE_MS);

/** 判断租约是否仍有效 */
export const isMergeLeaseActive = (
  expiresAt: Date | null | undefined,
  cutoff: Date,
): boolean => Boolean(expiresAt && expiresAt > cutoff);

/** 启动合并租约自动续期，返回停止续期的函数 */
export const startMergeLeaseRenewal = (
  ownerId: string,
  uploadId: string,
  mergeToken: string,
): (() => void) => {
  const timer = setInterval(() => {
    const cutoff = new Date();
    void UploadTask.updateOne(
      {
        _id: uploadId,
        ownerId,
        status: "merging",
        mergeToken,
        mergeLeaseExpiresAt: { $gt: cutoff },
        ...getActiveUploadTaskGuard(cutoff),
      },
      {
        $set: {
          mergeLeaseExpiresAt: getMergeLeaseExpiry(cutoff),
          expiresAt: new Date(cutoff.getTime() + fileUploadConfig.taskTtlMs),
        },
      },
    ).catch((error) => {
      logger.warn("上传合并租约续期失败", { uploadId, error });
    });
  }, MERGE_LEASE_MS / 3);
  timer.unref();
  return () => clearInterval(timer);
};
