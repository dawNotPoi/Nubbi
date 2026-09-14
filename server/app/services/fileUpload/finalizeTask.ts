import logger from "@/common/logger";
import { File } from "@/models/file/file";
import { UploadTask } from "@/models/file/uploadTask";
import { withFileFolderStructureLock } from "@/services/fileManagement/structureLock";
import fse from "fs-extra";
import path from "path";
import { fileUploadConfig } from "./config";
import { FileUploadError } from "./errors";
import { assertOwnedUploadFolder } from "./folderValidation";
import { removeUnreferencedUploadFile } from "./storageCleanup";
import { getActiveUploadTaskGuard } from "./taskPolicy";

type FinalizeTask = {
  _id: unknown;
  folderId?: unknown;
  fileName: string;
  mimeType?: string | null;
  totalSize: number;
  fileHash: string;
  mergeToken?: string | null;
};

export const finalizeUploadFile = (
  ownerId: string,
  task: FinalizeTask,
  storagePath: string,
) => withFileFolderStructureLock(ownerId, async () => {
  let ownsLease = false;
  try {
    const cutoff = new Date();
    const taskGuard = {
      _id: task._id,
      ownerId,
      status: "merging",
      mergeToken: task.mergeToken,
      mergeLeaseExpiresAt: { $gt: cutoff },
      ...getActiveUploadTaskGuard(cutoff),
      storagePath,
    };
    const activeTask = await UploadTask.exists(taskGuard);
    if (!activeTask) {
      throw new FileUploadError(409, "UPLOAD_EXPIRED", "上传合并租约已失效");
    }
    ownsLease = true;
    if (!(await fse.pathExists(storagePath))) {
      throw new FileUploadError(409, "UPLOAD_EXPIRED", "上传文件不存在");
    }

    await assertOwnedUploadFolder(ownerId, task.folderId, "final");
    const file = await File.findOneAndUpdate(
      { ownerId, uploadId: task._id },
      {
        $setOnInsert: {
          name: task.fileName,
          extension: path.extname(task.fileName),
          mimeType: task.mimeType,
          size: task.totalSize,
          hash: task.fileHash,
          folderId: task.folderId,
          ownerId,
          uploadId: task._id,
          storagePath,
          status: "active",
        },
      },
      { upsert: true, new: true },
    );
    const completed = await UploadTask.updateOne(
      taskGuard,
      {
        $set: {
          status: "completed",
          fileId: file._id,
          error: null,
          expiresAt: new Date(Date.now() + fileUploadConfig.taskTtlMs),
        },
        $unset: { storagePath: 1, mergeToken: 1, mergeLeaseExpiresAt: 1 },
      },
    );
    if (completed.matchedCount === 0) {
      throw new FileUploadError(409, "UPLOAD_EXPIRED", "上传合并租约已失效");
    }
    return file;
  } catch (error) {
    if (ownsLease) {
      await removeUnreferencedUploadFile(storagePath).catch((cleanupError) => {
        logger.warn("上传最终落库失败后的物理文件清理失败", {
          storagePath,
          error: cleanupError,
        });
      });
    }
    throw error;
  }
});
