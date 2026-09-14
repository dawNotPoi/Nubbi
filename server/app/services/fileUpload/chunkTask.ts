import logger from "@/common/logger";
import { waitForAll } from "@/common/promises";
import { UploadTask } from "@/models/file/uploadTask";
import { withFileFolderStructureLock } from "@/services/fileManagement/structureLock";
import fse from "fs-extra";
import path from "path";
import { expectedChunkBytes } from "./chunk-math";
import { fileUploadConfig } from "./config";
import { FileUploadError } from "./errors";
import { finalizeUploadFile } from "./finalizeTask";
import { claimUploadForMerge } from "./mergeClaim";
import { startMergeLeaseRenewal } from "./mergeLease";
import { mergeTaskChunks } from "./storage";
import {
  removeUnreferencedUploadFile,
  removeUploadStagingFiles,
} from "./storageCleanup";
import {
  getActiveUploadTaskGuard,
  isUploadTaskExpired,
} from "./taskPolicy";
import type {
  StoreUploadChunkInput,
  StoreUploadChunkResult,
  UploadedFileDto,
} from "./types";

/** 计算任务的新过期时间 */
const nextExpiry = () => new Date(Date.now() + fileUploadConfig.taskTtlMs);
const UPLOAD_MERGE_FAILED_MESSAGE = "文件合并失败，请稍后重试";

/** 清理合并失败后的物理文件 */
const cleanupFailedMerge = async (
  ownerId: string,
  uploadId: string,
  storagePath: string,
) => {
  await waitForAll(
    [
      removeUnreferencedUploadFile(storagePath),
      removeUploadStagingFiles(ownerId, uploadId),
    ],
    "上传失败后的物理文件清理未全部完成",
  ).catch((error) => {
    logger.warn("上传失败后的物理文件清理失败", {
      uploadId,
      storagePath,
      error,
    });
  });
};

/** 将失败的合并任务标记为 failed 并清理残留文件 */
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

/** 存储上传分片：校验任务状态、分片大小，移动分片文件并登记 */
export const storeUploadChunk = ({
  ownerId,
  uploadId,
  chunkIndex,
  incomingFile,
}: StoreUploadChunkInput): Promise<StoreUploadChunkResult> =>
  withFileFolderStructureLock(ownerId, async () => {
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
    await fse.remove(chunkPath).catch((error: unknown) => {
      logger.warn("不可写分片的临时文件清理失败", {
        uploadId,
        chunkPath,
        error,
      });
    });
    throw new FileUploadError(409, "UPLOAD_NOT_WRITABLE", "上传任务当前不可写入");
  }
  return { chunkIndex };
  });

/** 完成上传：声明合并权、合并分片、落库，失败时清理并标记任务 */
export const completeUpload = async (
  ownerId: string,
  uploadId: string,
): Promise<UploadedFileDto> => {
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
    await waitForAll(
      [
        fse.remove(task.tempDir),
        removeUploadStagingFiles(ownerId, uploadId),
      ],
      "上传完成后临时文件清理未全部完成",
    ).catch((error) => {
      logger.warn("上传完成后临时文件清理失败", { uploadId, error });
    });
    return file;
  } catch (error) {
    const publicError =
      error instanceof FileUploadError
        ? error
        : new FileUploadError(
            500,
            "UPLOAD_MERGE_FAILED",
            UPLOAD_MERGE_FAILED_MESSAGE,
          );
    if (!(error instanceof FileUploadError)) {
      logger.error("文件合并失败", { ownerId, uploadId, error });
    }
    await failClaimedMerge(
      ownerId,
      uploadId,
      mergeToken,
      storagePath,
      publicError.message,
    ).catch((cleanupError) => {
      logger.warn("未能获取物理文件清理锁", {
        uploadId,
        storagePath,
        error: cleanupError,
      });
    });
    throw publicError;
  } finally {
    stopLeaseRenewal();
  }
};
