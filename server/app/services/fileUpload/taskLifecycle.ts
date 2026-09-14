import { File } from "@/models/file/file";
import { UploadTask } from "@/models/file/uploadTask";
import { waitForAll } from "@/common/promises";
import { withFileFolderStructureLock } from "@/services/fileManagement/structureLock";
import fse from "fs-extra";
import { FileUploadError } from "./errors";
import { getUploadFinalPath } from "./storage";
import {
  removeUnreferencedUploadFile,
  removeUploadStagingFiles,
} from "./storageCleanup";
import type {
  CancelUploadResult,
  UploadTaskStatusDto,
} from "./types";
import { serializeUploadedFile } from "./file-dto";

/** 解析任务的实际存储路径：优先使用已有路径，否则按规则计算 */
const resolveTaskStoragePath = (task: {
  storagePath?: string | null;
  ownerId: string;
  fileHash: string;
  totalSize: number;
  fileName: string;
}) => task.storagePath || getUploadFinalPath(
  task.ownerId,
  task.fileHash,
  task.totalSize,
  task.fileName,
);

/** 查询上传任务状态，返回给前端的 DTO */
export const getUploadTaskStatus = async (
  ownerId: string,
  uploadId: string,
): Promise<UploadTaskStatusDto> => {
  const task = await UploadTask.findOne({ _id: uploadId, ownerId }).lean();
  if (!task) {
    throw new FileUploadError(404, "UPLOAD_NOT_FOUND", "上传任务已失效");
  }
  const file = task.fileId
    ? await File.findOne({ _id: task.fileId, ownerId }).lean()
    : null;
  return {
    uploadId: String(task._id),
    fileName: task.fileName,
    totalSize: task.totalSize,
    folderId: task.folderId ? String(task.folderId) : null,
    uploadedChunks: task.uploadedChunks,
    totalChunks: task.totalChunks,
    chunkSize: task.chunkSize,
    status: task.status,
    error: task.error,
    expiresAt: task.expiresAt,
    file: file ? serializeUploadedFile(file) : null,
  };
};

/** 取消上传任务：删除分片、暂存文件和最终文件，受目录结构锁保护 */
export const cancelUploadTask = (
  ownerId: string,
  uploadId: string,
): Promise<CancelUploadResult> =>
  withFileFolderStructureLock(ownerId, async () => {
    const task = await UploadTask.findOne({ _id: uploadId, ownerId });
    if (!task) return { cancelled: false };
    if (task.status === "completed") {
      throw new FileUploadError(409, "UPLOAD_COMPLETED", "已完成任务不能取消");
    }
    if (task.status === "merging") {
      throw new FileUploadError(409, "UPLOAD_MERGING", "文件合并期间不能取消");
    }
    await waitForAll(
      [
        removeUnreferencedUploadFile(resolveTaskStoragePath(task)),
        removeUploadStagingFiles(ownerId, String(task._id)),
      ],
      "上传任务清理未全部完成",
    );
    await fse.remove(task.tempDir);
    await task.deleteOne();
    return { cancelled: true };
  });

/** 删除用户全部上传任务及其关联文件（无锁版本，供已持锁的调用方使用） */
export const deleteUserUploadTasksUnlocked = async (
  ownerId: string,
): Promise<void> => {
  const tasks = await UploadTask.find({ ownerId })
    .select("ownerId fileHash totalSize fileName tempDir storagePath")
    .lean();
  await waitForAll(
    tasks.map(async (task) => {
      await waitForAll(
        [
          removeUnreferencedUploadFile(resolveTaskStoragePath(task)),
          removeUploadStagingFiles(ownerId, String(task._id)),
        ],
        "上传任务关联文件清理未全部完成",
      );
      await fse.remove(task.tempDir);
    }),
    "用户上传任务清理未全部完成",
  );
  await UploadTask.deleteMany({
    ownerId,
    _id: { $in: tasks.map((task) => task._id) },
  });
};

/** 删除用户全部上传任务，带目录结构锁保护 */
export const deleteUserUploadTasks = (ownerId: string): Promise<void> =>
  withFileFolderStructureLock(ownerId, () =>
    deleteUserUploadTasksUnlocked(ownerId),
  );
