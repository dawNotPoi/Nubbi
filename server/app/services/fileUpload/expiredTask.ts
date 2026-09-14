import { UploadTask } from "@/models/file/uploadTask";
import { withFileFolderStructureLock } from "@/services/fileManagement/structureLock";
import fse from "fs-extra";
import { randomUUID } from "node:crypto";
import { getUploadFinalPath } from "./storage";
import {
  removeUnreferencedUploadFile,
  removeUploadStagingFiles,
} from "./storageCleanup";

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
  await Promise.all([
    removeUnreferencedUploadFile(storagePath),
    removeUploadStagingFiles(ownerId, String(task._id)),
  ]);
  await fse.remove(task.tempDir);
  await UploadTask.deleteOne({
    _id: task._id,
    ownerId,
    cleanupToken,
    expiresAt: { $lte: cutoff },
  });
  return true;
};

export const cleanupExpiredUploadTask = (
  ownerId: string,
  uploadId: string,
  cutoff = new Date(),
) => withFileFolderStructureLock(ownerId, () =>
  cleanupExpiredUploadTaskUnlocked(ownerId, uploadId, cutoff),
);
