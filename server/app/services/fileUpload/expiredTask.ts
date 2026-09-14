import { UploadTask } from "@/models/file/uploadTask";
import { waitForAll } from "@/common/promises";
import { withFileFolderStructureLock } from "@/services/fileManagement/structureLock";
import fse from "fs-extra";
import { randomUUID } from "node:crypto";
import { getUploadFinalPath } from "./storage";
import {
  removeUnreferencedUploadFile,
  removeUploadStagingFiles,
} from "./storageCleanup";

/** 清理过期上传任务（无锁版）：标记清理 token 防并发，删除文件记录 */
export const cleanupExpiredUploadTaskUnlocked = async (
  ownerId: string,
  uploadId: string,
  cutoff: Date,
): Promise<boolean> => {
  const cleanupToken = randomUUID();
  const task = await UploadTask.findOneAndUpdate(
    { _id: uploadId, ownerId, expiresAt: { $lte: cutoff } },
    { $set: { cleanupToken } },
    { new: true },
  );
  if (!task) return false;

  const storagePath = task.storagePath || getUploadFinalPath(
    ownerId,
    task.fileHash,
    task.totalSize,
    task.fileName,
  );
  await waitForAll(
    [
      removeUnreferencedUploadFile(storagePath),
      removeUploadStagingFiles(ownerId, String(task._id)),
    ],
    "过期上传任务关联文件清理未全部完成",
  );
  await fse.remove(task.tempDir);
  await UploadTask.deleteOne({
    _id: task._id,
    ownerId,
    cleanupToken,
    expiresAt: { $lte: cutoff },
  });
  return true;
};

/** 清理过期上传任务（带目录结构锁） */
export const cleanupExpiredUploadTask = (
  ownerId: string,
  uploadId: string,
  cutoff = new Date(),
): Promise<boolean> => withFileFolderStructureLock(ownerId, () =>
  cleanupExpiredUploadTaskUnlocked(ownerId, uploadId, cutoff),
);
