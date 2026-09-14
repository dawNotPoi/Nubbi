import { File } from "@/models/file/file";
import { UploadTask } from "@/models/file/uploadTask";
import { fileUploadConfig } from "./config";
import { FileUploadError } from "./errors";
import { getActiveUploadTaskGuard } from "./taskPolicy";

/** 活跃上传任务的过滤条件（排除已完成和已过期） */
const activeTaskFilter = (ownerId: string) => ({
  ownerId,
  status: { $ne: "completed" },
  ...getActiveUploadTaskGuard(new Date()),
});

/** 用户存储用量：活跃文件占用 + 未完成上传任务预留 */
export type StorageUsage = {
  usedBytes: number;
  reservedBytes: number;
};

/**
 * 汇总用户存储用量，配额校验与用量展示共用同一口径。
 * @param ownerId 用户 ID。
 * @returns 活跃文件占用字节数与上传任务预留字节数。
 */
export const getStorageUsage = async (
  ownerId: string,
): Promise<StorageUsage> => {
  const [fileUsage, taskUsage] = await Promise.all([
    File.aggregate<{ total: number }>([
      { $match: { ownerId, status: "active" } },
      { $group: { _id: null, total: { $sum: "$size" } } },
    ]),
    UploadTask.aggregate<{ total: number }>([
      { $match: activeTaskFilter(ownerId) },
      { $group: { _id: null, total: { $sum: "$totalSize" } } },
    ]),
  ]);
  return {
    usedBytes: fileUsage[0]?.total ?? 0,
    reservedBytes: taskUsage[0]?.total ?? 0,
  };
};

/** 校验用户存储配额：文件占用 + 未完成任务预留，超限抛 413 */
export const assertUploadQuota = async (
  ownerId: string,
  size: number,
): Promise<void> => {
  const { usedBytes, reservedBytes } = await getStorageUsage(ownerId);
  const reserved = usedBytes + reservedBytes;
  if (reserved + size > fileUploadConfig.userQuotaBytes) {
    throw new FileUploadError(413, "UPLOAD_QUOTA_EXCEEDED", "用户存储空间不足");
  }
};

/** 统计用户的活跃上传任务数 */
export const countActiveUploadTasks = (
  ownerId: string,
): ReturnType<typeof UploadTask.countDocuments> =>
  UploadTask.countDocuments(activeTaskFilter(ownerId));
