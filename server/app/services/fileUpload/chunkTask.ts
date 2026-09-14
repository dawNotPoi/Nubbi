import logger from "@/common/logger";
import { UploadTask } from "@/models/file/uploadTask";
import { withFileFolderStructureLock } from "@/services/fileManagement/structureLock";
import fse from "fs-extra";
import path from "path";
import { fileUploadConfig } from "./config";
import { FileUploadError } from "./errors";
import { finalizeUploadFile } from "./finalizeTask";
import { claimUploadForMerge } from "./mergeClaim";
import { startMergeLeaseRenewal } from "./mergeLease";
import { expectedChunkBytes } from "./schemas";
import { mergeTaskChunks } from "./storage";
import {
  removeUnreferencedUploadFile,
  removeUploadStagingFiles,
} from "./storageCleanup";
import {
  getActiveUploadTaskGuard,
  isUploadTaskExpired,
} from "./taskPolicy";

const nextExpiry = () => new Date(Date.now() + fileUploadConfig.taskTtlMs);

const cleanupFailedMerge = async (
  ownerId: string,
  uploadId: string,
  storagePath: string,
) => {
  await Promise.all([
    removeUnreferencedUploadFile(storagePath),
    removeUploadStagingFiles(ownerId, uploadId),
  ]).catch((error) => {
    logger.warn("上传失败后的物理文件清理失败", {
      uploadId,
      storagePath,
      error,
    });
  });
};

const failClaimedMerge = (
  ownerId: string,
  uploadId: string,
  mergeToken: string,
  storagePath: string,
  message: string,
) => withFileFolderStructureLock(ownerId, async () => {
  const cutoff = new Date();
  const leaseGuard = {
    _id: uploadId,
    ownerId,
    status: "merging",
    mergeToken,
    mergeLeaseExpiresAt: { $gt: cutoff },
    ...getActiveUploadTaskGuard(cutoff),
  };
  const owned = await UploadTask.exists(leaseGuard);
  if (!owned) return;
  await cleanupFailedMerge(ownerId, uploadId, storagePath);
  await UploadTask.updateOne(
    leaseGuard,
    {
      $set: {
        status: "failed",
        storagePath,
        error: message,
        expiresAt: nextExpiry(),
      },
      $unset: { mergeToken: 1, mergeLeaseExpiresAt: 1 },
    },
  );
});

type StoreChunkInput = {
  ownerId: string;
  uploadId: string;
  chunkIndex: number;
  incomingFile: Express.Multer.File;
};

export const storeUploadChunk = ({
  ownerId,
  uploadId,
  chunkIndex,
  incomingFile,
}: StoreChunkInput) => withFileFolderStructureLock(ownerId, async () => {
  const cutoff = new Date();
  const task = await UploadTask.findOne({ _id: uploadId, ownerId });
  if (!task) {
    throw new FileUploadError(404, "UPLOAD_NOT_FOUND", "上传任务已失效");
  }
  if (isUploadTaskExpired(task.expiresAt, cutoff)) {
    throw new FileUploadError(409, "UPLOAD_EXPIRED", "上传任务已过期");
  }
  if (task.cleanupToken || ["completed", "merging"].includes(task.status)) {
    throw new FileUploadError(409, "UPLOAD_NOT_WRITABLE", "上传任务当前不可写入");
  }

  const expected = expectedChunkBytes(
    task.totalSize,
    task.chunkSize,
    task.totalChunks,
    chunkIndex,
  );
  if (expected === null || incomingFile.size !== expected) {
    throw new FileUploadError(400, "CHUNK_SIZE_INVALID", "分片序号或大小不正确");
  }

  await fse.ensureDir(task.tempDir);
  const chunkPath = path.join(task.tempDir, String(chunkIndex));
  await fse.move(incomingFile.path, chunkPath, { overwrite: true });
  const update = await UploadTask.updateOne(
    {
      _id: uploadId,
      ownerId,
      ...getActiveUploadTaskGuard(cutoff),
      status: task.status,
    },
    {
      $addToSet: { uploadedChunks: chunkIndex },
      $set: { status: "uploading", error: null, expiresAt: nextExpiry() },
    },
  );
  if (update.matchedCount === 0) {
    await fse.remove(chunkPath);
    throw new FileUploadError(409, "UPLOAD_NOT_WRITABLE", "上传任务当前不可写入");
  }
  return { chunkIndex };
});

export const completeUpload = async (ownerId: string, uploadId: string) => {
  const claimed = await claimUploadForMerge(ownerId, uploadId);
  if (claimed.completedFile) return claimed.completedFile;
  const task = claimed.task!;
  const mergeToken = task.mergeToken!;
  const stopLeaseRenewal = startMergeLeaseRenewal(
    ownerId,
    uploadId,
    mergeToken,
  );
  let storagePath = task.storagePath!;

  try {
    storagePath = await mergeTaskChunks(task);
    const file = await finalizeUploadFile(ownerId, task, storagePath);
    await Promise.all([
      fse.remove(task.tempDir),
      removeUploadStagingFiles(ownerId, uploadId),
    ]).catch((error) => {
      logger.warn("上传完成后临时文件清理失败", { uploadId, error });
    });
    return file;
  } catch (error) {
    const message = error instanceof Error ? error.message : "文件合并失败";
    await failClaimedMerge(
      ownerId,
      uploadId,
      mergeToken,
      storagePath,
      message,
    ).catch((cleanupError) => {
      logger.warn("未能获取物理文件清理锁", {
        uploadId,
        storagePath,
        error: cleanupError,
      });
    });
    throw error;
  } finally {
    stopLeaseRenewal();
  }
};
