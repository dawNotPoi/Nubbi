import { File } from "@/models/file/file";
import { UploadTask } from "@/models/file/uploadTask";
import { withFileFolderStructureLock } from "@/services/fileManagement/structureLock";
import fse from "fs-extra";
import { randomUUID } from "node:crypto";
import { fileUploadConfig } from "./config";
import { FileUploadError } from "./errors";
import { getMergeLeaseExpiry, isMergeLeaseActive } from "./mergeLease";
import { getUploadFinalPath } from "./storage";
import { getActiveUploadTaskGuard } from "./taskPolicy";

const recoverCompletedFile = async (ownerId: string, task: {
  _id: unknown;
  fileId?: unknown;
}) => {
  const file = await File.findOne({
    ownerId,
    $or: [
      { uploadId: task._id },
      ...(task.fileId ? [{ _id: task.fileId }] : []),
    ],
  });
  if (!file || !(await fse.pathExists(file.storagePath))) return null;
  await UploadTask.updateOne(
    { _id: task._id, ownerId },
    {
      $set: { status: "completed", fileId: file._id, error: null },
      $unset: { storagePath: 1, mergeToken: 1, mergeLeaseExpiresAt: 1 },
    },
  );
  return file;
};

export const claimUploadForMerge = (ownerId: string, uploadId: string) =>
  withFileFolderStructureLock(ownerId, async () => {
    const cutoff = new Date();
    const current = await UploadTask.findOne({ _id: uploadId, ownerId });
    if (!current) {
      throw new FileUploadError(404, "UPLOAD_NOT_FOUND", "上传任务已失效");
    }
    if (["completed", "merging"].includes(current.status)) {
      const recovered = await recoverCompletedFile(ownerId, current);
      if (recovered) return { completedFile: recovered, task: null };
    }
    if (current.expiresAt <= cutoff || current.cleanupToken) {
      throw new FileUploadError(409, "UPLOAD_EXPIRED", "上传任务已过期");
    }
    if (
      current.status === "merging" &&
      isMergeLeaseActive(current.mergeLeaseExpiresAt, cutoff)
    ) {
      throw new FileUploadError(409, "UPLOAD_MERGING", "文件正在合并，请稍后重试");
    }

    const storagePath = getUploadFinalPath(
      ownerId,
      current.fileHash,
      current.totalSize,
      current.fileName,
    );
    const mergeToken = randomUUID();
    const task = await UploadTask.findOneAndUpdate(
      {
        _id: uploadId,
        ownerId,
        ...getActiveUploadTaskGuard(cutoff),
        $or: [
          { status: { $in: ["uploading", "failed"] } },
          { status: "merging", mergeLeaseExpiresAt: { $lte: cutoff } },
          { status: "merging", mergeLeaseExpiresAt: null },
        ],
      },
      {
        $set: {
          status: "merging",
          storagePath,
          mergeToken,
          mergeLeaseExpiresAt: getMergeLeaseExpiry(cutoff),
          error: null,
          expiresAt: new Date(cutoff.getTime() + fileUploadConfig.taskTtlMs),
        },
      },
      { new: true },
    );
    if (!task) {
      throw new FileUploadError(409, "UPLOAD_MERGING", "文件正在合并");
    }
    return { completedFile: null, task };
  });
