import { File } from "@/models/file/file";
import { UploadTask } from "@/models/file/uploadTask";
import fse from "fs-extra";
import { FileUploadError } from "./errors";

export const getUploadTaskStatus = async (ownerId: string, uploadId: string) => {
  const task = await UploadTask.findOne({ _id: uploadId, ownerId }).lean();
  if (!task) throw new FileUploadError(404, "UPLOAD_NOT_FOUND", "上传任务已失效");
  const file = task.fileId ? await File.findById(task.fileId).lean() : null;
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
    file,
  };
};

export const cancelUploadTask = async (ownerId: string, uploadId: string) => {
  const task = await UploadTask.findOne({ _id: uploadId, ownerId });
  if (!task) return { cancelled: false };
  if (task.status === "completed") {
    throw new FileUploadError(409, "UPLOAD_COMPLETED", "已完成任务不能取消");
  }
  if (task.status === "merging") {
    throw new FileUploadError(409, "UPLOAD_MERGING", "文件合并期间不能取消");
  }
  await fse.remove(task.tempDir);
  await task.deleteOne();
  return { cancelled: true };
};

export const deleteUserUploadTasks = async (ownerId: string) => {
  const tasks = await UploadTask.find({ ownerId }).select("tempDir").lean();
  await Promise.all(tasks.map((task) => fse.remove(task.tempDir)));
  await UploadTask.deleteMany({ ownerId });
};
