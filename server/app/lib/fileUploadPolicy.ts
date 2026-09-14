import path from "node:path";
import env from "./env";

export const MEBIBYTE = 1024 * 1024;
export const ALLOWED_CHUNK_SIZES = [5, 10, 20].map(
  (size) => size * MEBIBYTE,
);

const uploadRoot = path.join(process.cwd(), "storage");

export const fileUploadPolicy = {
  maxFileBytes: env.FILE_UPLOAD_MAX_FILE_BYTES,
  userQuotaBytes: env.FILE_UPLOAD_USER_QUOTA_BYTES,
  maxActiveTasks: env.FILE_UPLOAD_MAX_ACTIVE_TASKS,
  taskTtlMs: env.FILE_UPLOAD_TASK_TTL_HOURS * 60 * 60 * 1000,
  maxChunkBytes: Math.max(...ALLOWED_CHUNK_SIZES),
} as const;

export const fileUploadPaths = {
  root: uploadRoot,
  temp: path.join(uploadRoot, "temp"),
  multerTemp: path.join(uploadRoot, "temp_multer"),
  final: path.join(uploadRoot, "uploads"),
} as const;
