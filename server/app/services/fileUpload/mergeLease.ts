import logger from "@/common/logger";
import { UploadTask } from "@/models/file/uploadTask";
import { fileUploadConfig } from "./config";
import { getActiveUploadTaskGuard } from "./taskPolicy";

export const MERGE_LEASE_MS = 5 * 60 * 1000;

export const getMergeLeaseExpiry = (now: Date) =>
  new Date(now.getTime() + MERGE_LEASE_MS);

export const isMergeLeaseActive = (
  expiresAt: Date | null | undefined,
  cutoff: Date,
) => Boolean(expiresAt && expiresAt > cutoff);

export const startMergeLeaseRenewal = (
  ownerId: string,
  uploadId: string,
  mergeToken: string,
) => {
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
