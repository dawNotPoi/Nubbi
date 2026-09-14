import { File } from "@/models/file/file";
import { UploadTask } from "@/models/file/uploadTask";
import { fileUploadConfig } from "./config";
import { FileUploadError } from "./errors";
import { getActiveUploadTaskGuard } from "./taskPolicy";

const activeTaskFilter = (ownerId: string) => ({
  ownerId,
  status: { $ne: "completed" },
  ...getActiveUploadTaskGuard(new Date()),
});

export const assertUploadQuota = async (
  ownerId: string,
  size: number,
): Promise<void> => {
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
  const reserved = (fileUsage[0]?.total ?? 0) + (taskUsage[0]?.total ?? 0);
  if (reserved + size > fileUploadConfig.userQuotaBytes) {
    throw new FileUploadError(413, "UPLOAD_QUOTA_EXCEEDED", "用户存储空间不足");
  }
};

export const countActiveUploadTasks = (
  ownerId: string,
): ReturnType<typeof UploadTask.countDocuments> =>
  UploadTask.countDocuments(activeTaskFilter(ownerId));
