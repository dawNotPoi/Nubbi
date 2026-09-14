import logger from "@/common/logger";
import { File } from "@/models/file/file";
import { UploadTask } from "@/models/file/uploadTask";
import fse from "fs-extra";
import path from "path";
import { fileUploadConfig } from "./config";
import { FileUploadError } from "./errors";
import { expectedChunkBytes } from "./schemas";
import { mergeTaskChunks } from "./storage";

const nextExpiry = () => new Date(Date.now() + fileUploadConfig.taskTtlMs);

export const storeUploadChunk = async ({
  ownerId,
  uploadId,
  chunkIndex,
  incomingFile,
}: {
  ownerId: string;
  uploadId: string;
  chunkIndex: number;
  incomingFile: Express.Multer.File;
}) => {
  const task = await UploadTask.findOne({ _id: uploadId, ownerId });
  if (!task) throw new FileUploadError(404, "UPLOAD_NOT_FOUND", "上传任务已失效");
  if (task.status === "completed" || task.status === "merging") {
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
  await UploadTask.updateOne(
    { _id: uploadId, ownerId },
    {
      $addToSet: { uploadedChunks: chunkIndex },
      $set: { status: "uploading", error: null, expiresAt: nextExpiry() },
    },
  );
  return { chunkIndex };
};

export const completeUpload = async (ownerId: string, uploadId: string) => {
  const current = await UploadTask.findOne({ _id: uploadId, ownerId });
  if (!current) throw new FileUploadError(404, "UPLOAD_NOT_FOUND", "上传任务已失效");
  if (current.status === "completed" && current.fileId) {
    const completedFile = await File.findById(current.fileId);
    if (completedFile) return completedFile;
  }
  if (current.status === "merging") {
    throw new FileUploadError(409, "UPLOAD_MERGING", "文件正在合并，请稍后重试");
  }

  const task = await UploadTask.findOneAndUpdate(
    { _id: uploadId, ownerId, status: { $ne: "merging" } },
    { $set: { status: "merging", error: null, expiresAt: nextExpiry() } },
    { new: true },
  );
  if (!task) throw new FileUploadError(409, "UPLOAD_MERGING", "文件正在合并");

  try {
    const storagePath = await mergeTaskChunks(task);
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
    await UploadTask.updateOne(
      { _id: task._id },
      {
        $set: {
          status: "completed",
          fileId: file._id,
          error: null,
          expiresAt: nextExpiry(),
        },
      },
    );
    await fse.remove(task.tempDir).catch((error) => {
      logger.warn("上传完成后临时目录清理失败", { uploadId, error });
    });
    return file;
  } catch (error) {
    const message = error instanceof Error ? error.message : "文件合并失败";
    await UploadTask.updateOne(
      { _id: task._id },
      { $set: { status: "failed", error: message, expiresAt: nextExpiry() } },
    );
    throw error;
  }
};
