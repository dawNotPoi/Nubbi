import { UploadTask } from "@/models/file/uploadTask";
import { fileUploadConfig } from "./config";
import { FileUploadError } from "./errors";
import { getActiveUploadTaskGuard } from "./taskPolicy";
import type { InitUploadInput, UploadProgressDto } from "./types";

/** 恢复未完成的上传任务：校验文件目标一致，延长过期时间并返回进度 */
export const resumeUploadTaskUnlocked = async (
  ownerId: string,
  uploadId: string,
  input: InitUploadInput,
  cutoff: Date,
): Promise<UploadProgressDto | null> => {
  const task = await UploadTask.findOne({
    _id: uploadId,
    ownerId,
    ...getActiveUploadTaskGuard(cutoff),
  });
  if (!task || task.status === "completed") return null;
  if (task.status === "merging") {
    throw new FileUploadError(
      409,
      "UPLOAD_MERGING",
      "文件正在合并，请稍后重试",
    );
  }

  const sameTarget =
    task.fileName === input.fileName &&
    String(task.folderId ?? "") === String(input.folderId ?? "");
  if (!sameTarget) {
    throw new FileUploadError(
      409,
      "FILE_ALREADY_UPLOADING",
      "相同文件正在上传，请等待完成后重试",
    );
  }

  task.expiresAt = new Date(Date.now() + fileUploadConfig.taskTtlMs);
  await task.save();
  return {
    needUpload: true as const,
    status: task.status,
    uploadId: String(task._id),
    uploadedChunks: task.uploadedChunks,
    expiresAt: task.expiresAt.toISOString(),
  };
};
