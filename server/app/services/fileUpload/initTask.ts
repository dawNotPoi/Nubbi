import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import { UploadTask } from "@/models/file/uploadTask";
import fse from "fs-extra";
import path from "path";
import { fileUploadConfig } from "./config";
import { FileUploadError } from "./errors";
import type { InitUploadInput } from "./schemas";
import { ensureUploadDirectories, getTaskTempDir } from "./storage";

const ownerLocks = new Map<string, Promise<void>>();

const withOwnerLock = async <T>(ownerId: string, work: () => Promise<T>) => {
  const previous = ownerLocks.get(ownerId) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  ownerLocks.set(ownerId, tail);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (ownerLocks.get(ownerId) === tail) ownerLocks.delete(ownerId);
  }
};

const getUserReservedBytes = async (ownerId: string) => {
  const [fileUsage, taskUsage] = await Promise.all([
    File.aggregate<{ total: number }>([
      { $match: { ownerId, status: "active" } },
      { $group: { _id: null, total: { $sum: "$size" } } },
    ]),
    UploadTask.aggregate<{ total: number }>([
      { $match: { ownerId, status: { $ne: "completed" } } },
      { $group: { _id: null, total: { $sum: "$totalSize" } } },
    ]),
  ]);
  return (fileUsage[0]?.total ?? 0) + (taskUsage[0]?.total ?? 0);
};

const assertQuota = async (ownerId: string, size: number) => {
  const reserved = await getUserReservedBytes(ownerId);
  if (reserved + size > fileUploadConfig.userQuotaBytes) {
    throw new FileUploadError(413, "UPLOAD_QUOTA_EXCEEDED", "用户存储空间不足");
  }
};

export const buildInstantFileFilter = (
  ownerId: string,
  input: Pick<InitUploadInput, "fileHash" | "totalSize">,
) => ({
    ownerId,
    hash: input.fileHash,
    size: input.totalSize,
    status: "active",
  } as const);

const findInstantFile = async (ownerId: string, input: InitUploadInput) => {
  const file = await File.findOne(buildInstantFileFilter(ownerId, input));
  if (!file || !(await fse.pathExists(file.storagePath))) return null;
  return file;
};

export const initializeUpload = (ownerId: string, input: InitUploadInput) =>
  withOwnerLock(ownerId, async () => {
    await ensureUploadDirectories();
    if (input.folderId) {
      const folder = await Folder.exists({ _id: input.folderId, ownerId });
      if (!folder) {
        throw new FileUploadError(403, "FOLDER_FORBIDDEN", "无权访问该文件夹");
      }
    }

    const existingTask = await UploadTask.findOne({
      ownerId,
      fileHash: input.fileHash,
      totalSize: input.totalSize,
    });
    if (existingTask && existingTask.status !== "completed") {
      if (existingTask.status === "merging") {
        throw new FileUploadError(409, "UPLOAD_MERGING", "文件正在合并，请稍后重试");
      }
      const sameTarget =
        existingTask.fileName === input.fileName &&
        String(existingTask.folderId ?? "") === String(input.folderId ?? "");
      if (!sameTarget) {
        throw new FileUploadError(
          409,
          "FILE_ALREADY_UPLOADING",
          "相同文件正在上传，请等待完成后重试",
        );
      }
      existingTask.expiresAt = new Date(Date.now() + fileUploadConfig.taskTtlMs);
      await existingTask.save();
      return {
        needUpload: true as const,
        status: existingTask.status,
        uploadId: String(existingTask._id),
        uploadedChunks: existingTask.uploadedChunks,
        expiresAt: existingTask.expiresAt.toISOString(),
      };
    }

    const instantFile = await findInstantFile(ownerId, input);
    if (instantFile) {
      await assertQuota(ownerId, input.totalSize);
      const file = await File.create({
        name: input.fileName,
        extension: path.extname(input.fileName),
        mimeType: input.mimeType || instantFile.mimeType,
        size: input.totalSize,
        hash: input.fileHash,
        folderId: input.folderId || null,
        ownerId,
        storagePath: instantFile.storagePath,
        status: "active",
      });
      return { needUpload: false as const, file };
    }
    if (existingTask?.status === "completed") {
      await existingTask.deleteOne();
    }

    const activeTasks = await UploadTask.countDocuments({
      ownerId,
      status: { $ne: "completed" },
    });
    if (activeTasks >= fileUploadConfig.maxActiveTasks) {
      throw new FileUploadError(429, "TOO_MANY_UPLOADS", "未完成上传任务过多");
    }
    await assertQuota(ownerId, input.totalSize);

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
  });
