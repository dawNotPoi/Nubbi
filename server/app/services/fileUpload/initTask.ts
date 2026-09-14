import { File } from "@/models/file/file";
import { UploadTask } from "@/models/file/uploadTask";
import { withFileFolderStructureLock } from "@/services/fileManagement/structureLock";
import fse from "fs-extra";
import path from "path";
import { fileUploadConfig } from "./config";
import { FileUploadError } from "./errors";
import { cleanupExpiredUploadTaskUnlocked } from "./expiredTask";
import { buildInstantFileFilter } from "./filters";
import { assertOwnedUploadFolder } from "./folderValidation";
import { assertUploadQuota, countActiveUploadTasks } from "./reservation";
import { resumeUploadTaskUnlocked } from "./resumeTask";
import type { InitUploadInput } from "./schemas";
import {
  ensureUploadDirectories,
  getTaskTempDir,
  getUploadFinalPath,
} from "./storage";
import {
  removeUnreferencedUploadFile,
  removeUploadStagingFiles,
} from "./storageCleanup";
import { isUploadTaskExpired } from "./taskPolicy";

const findUploadTask = (ownerId: string, input: InitUploadInput) =>
  UploadTask.findOne({
    ownerId,
    fileHash: input.fileHash,
    totalSize: input.totalSize,
  });

const findInstantFile = async (ownerId: string, input: InitUploadInput) => {
  const file = await File.findOne(buildInstantFileFilter(ownerId, input));
  if (!file || !(await fse.pathExists(file.storagePath))) return null;
  return file;
};

const createInstantFile = async (ownerId: string, input: InitUploadInput) => {
  const sourceFile = await findInstantFile(ownerId, input);
  if (!sourceFile) return null;
  await assertUploadQuota(ownerId, input.totalSize);
  await assertOwnedUploadFolder(ownerId, input.folderId, "final");
  return File.create({
    name: input.fileName,
    extension: path.extname(input.fileName),
    mimeType: input.mimeType || sourceFile.mimeType,
    size: input.totalSize,
    hash: input.fileHash,
    folderId: input.folderId || null,
    ownerId,
    storagePath: sourceFile.storagePath,
    status: "active",
  });
};

const createUploadTask = async (ownerId: string, input: InitUploadInput) => {
  const activeTasks = await countActiveUploadTasks(ownerId);
  if (activeTasks >= fileUploadConfig.maxActiveTasks) {
    throw new FileUploadError(429, "TOO_MANY_UPLOADS", "未完成上传任务过多");
  }
  await assertUploadQuota(ownerId, input.totalSize);

  const task = new UploadTask({
    ownerId,
    fileHash: input.fileHash,
    fileName: input.fileName,
    totalSize: input.totalSize,
    folderId: input.folderId || null,
    mimeType: input.mimeType,
    chunkSize: input.chunkSize,
    totalChunks: input.totalChunks,
    uploadedChunks: [],
    tempDir: "pending",
    status: "uploading",
    expiresAt: new Date(Date.now() + fileUploadConfig.taskTtlMs),
  });
  task.tempDir = getTaskTempDir(String(task._id));
  await fse.ensureDir(task.tempDir);
  try {
    await task.save();
  } catch (error) {
    await fse.remove(task.tempDir);
    throw error;
  }
  return {
    needUpload: true as const,
    status: task.status,
    uploadId: String(task._id),
    uploadedChunks: [],
    expiresAt: task.expiresAt.toISOString(),
  };
};

export const initializeUpload = async (
  ownerId: string,
  input: InitUploadInput,
) => {
  await ensureUploadDirectories();
  return withFileFolderStructureLock(ownerId, async () => {
    await assertOwnedUploadFolder(ownerId, input.folderId);
    const cutoff = new Date();
    let existingTask = await findUploadTask(ownerId, input);

    if (existingTask && isUploadTaskExpired(existingTask.expiresAt, cutoff)) {
      await cleanupExpiredUploadTaskUnlocked(
        ownerId,
        String(existingTask._id),
        cutoff,
      );
      existingTask = await findUploadTask(ownerId, input);
    }
    if (existingTask && existingTask.status !== "completed") {
      const resumed = await resumeUploadTaskUnlocked(
        ownerId,
        String(existingTask._id),
        input,
        cutoff,
      );
      if (resumed) return resumed;
      throw new FileUploadError(409, "UPLOAD_EXPIRED", "上传任务已过期");
    }

    const instantFile = await createInstantFile(ownerId, input);
    if (instantFile) return { needUpload: false as const, file: instantFile };
    if (existingTask?.status === "completed") {
      const storagePath = existingTask.storagePath || getUploadFinalPath(
        ownerId,
        existingTask.fileHash,
        existingTask.totalSize,
        existingTask.fileName,
      );
      await Promise.all([
        removeUnreferencedUploadFile(storagePath),
        removeUploadStagingFiles(ownerId, String(existingTask._id)),
        fse.remove(existingTask.tempDir),
      ]);
      await existingTask.deleteOne();
    }
    return createUploadTask(ownerId, input);
  });
};
