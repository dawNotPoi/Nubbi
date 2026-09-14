import crypto from "crypto";
import fse from "fs-extra";
import path from "path";
import { pipeline } from "stream/promises";
import { FileUploadError } from "./errors";
import { expectedChunkBytes } from "./schemas";

export const UPLOAD_ROOT = path.join(process.cwd(), "storage");
export const UPLOAD_TEMP_DIR = path.join(UPLOAD_ROOT, "temp");
export const MULTER_TEMP_DIR = path.join(UPLOAD_ROOT, "temp_multer");
export const UPLOAD_FINAL_DIR = path.join(UPLOAD_ROOT, "uploads");

export const ensureUploadDirectories = async () => {
  await Promise.all([
    fse.ensureDir(UPLOAD_TEMP_DIR),
    fse.ensureDir(MULTER_TEMP_DIR),
    fse.ensureDir(UPLOAD_FINAL_DIR),
  ]);
};

export const getTaskTempDir = (uploadId: string) =>
  path.join(UPLOAD_TEMP_DIR, uploadId);

const getOwnerStorageKey = (ownerId: string) =>
  crypto.createHash("sha256").update(ownerId).digest("hex").slice(0, 24);

export const getUploadOwnerDirectory = (ownerId: string) =>
  path.join(UPLOAD_FINAL_DIR, getOwnerStorageKey(ownerId));

export const getUploadFinalPath = (
  ownerId: string,
  fileHash: string,
  totalSize: number,
  fileName: string,
): string => {
  const ownerDir = getUploadOwnerDirectory(ownerId);
  const extension = path.extname(fileName).slice(0, 24);
  return path.join(ownerDir, `${fileHash}-${totalSize}${extension}`);
};

export const getUploadStagingPath = (
  ownerId: string,
  uploadId: string,
  mergeToken?: string | null,
) => path.join(
  getUploadOwnerDirectory(ownerId),
  `.${uploadId}${mergeToken ? `-${mergeToken}` : ""}.part`,
);

type MergeTask = {
  _id: unknown;
  ownerId: string;
  fileHash: string;
  fileName: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  tempDir: string;
  uploadedChunks: number[];
  mergeToken?: string | null;
};

export const mergeTaskChunks = async (task: MergeTask) => {
  const expectedIndexes = Array.from(
    { length: task.totalChunks },
    (_, index) => index,
  );
  const uploaded = [...new Set(task.uploadedChunks)].sort((a, b) => a - b);

  if (
    uploaded.length !== expectedIndexes.length ||
    uploaded.some((value, index) => value !== expectedIndexes[index])
  ) {
    throw new FileUploadError(400, "CHUNKS_INCOMPLETE", "上传分片不完整");
  }

  const finalPath = getUploadFinalPath(
    task.ownerId,
    task.fileHash,
    task.totalSize,
    task.fileName,
  );
  const ownerDir = path.dirname(finalPath);
  await fse.ensureDir(ownerDir);

  if (await fse.pathExists(finalPath)) {
    const existing = await fse.stat(finalPath);
    if (existing.size === task.totalSize) return finalPath;
    throw new FileUploadError(409, "FILE_CONFLICT", "目标文件状态异常");
  }

  const stagingPath = getUploadStagingPath(
    task.ownerId,
    String(task._id),
    task.mergeToken,
  );
  await fse.ensureFile(stagingPath);
  await fse.truncate(stagingPath, 0);

  try {
    for (let index = 0; index < task.totalChunks; index++) {
      const chunkPath = path.join(task.tempDir, String(index));
      const stat = await fse.stat(chunkPath).catch(() => null);
      const expected = expectedChunkBytes(
        task.totalSize,
        task.chunkSize,
        task.totalChunks,
        index,
      );
      if (!stat || stat.size !== expected) {
        throw new FileUploadError(
          400,
          "CHUNK_SIZE_INVALID",
          `分片 ${index} 大小异常`,
        );
      }
      await pipeline(
        fse.createReadStream(chunkPath),
        fse.createWriteStream(stagingPath, { flags: "a" }),
      );
    }

    const merged = await fse.stat(stagingPath);
    if (merged.size !== task.totalSize) {
      throw new FileUploadError(
        400,
        "FILE_SIZE_MISMATCH",
        "合并后文件大小异常",
      );
    }
    await fse.move(stagingPath, finalPath, { overwrite: false });
    return finalPath;
  } catch (error) {
    await fse.remove(stagingPath);
    throw error;
  }
};
