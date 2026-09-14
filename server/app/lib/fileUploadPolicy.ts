import path from "node:path";
import env from "./env";

/** 1 MiB 常量 */
export const MEBIBYTE = 1024 * 1024;
/** 允许的分片大小档位（5MB / 10MB / 20MB） */
export const ALLOWED_CHUNK_SIZES = [5, 10, 20].map(
  (size) => size * MEBIBYTE,
);

/** 文件存储根目录 */
const uploadRoot = path.join(process.cwd(), "storage");

/** 文件上传策略：大小上限、配额、并发任务数、TTL、最大分片 */
export const fileUploadPolicy = {
  maxFileBytes: env.FILE_UPLOAD_MAX_FILE_BYTES,
  userQuotaBytes: env.FILE_UPLOAD_USER_QUOTA_BYTES,
  maxActiveTasks: env.FILE_UPLOAD_MAX_ACTIVE_TASKS,
  taskTtlMs: env.FILE_UPLOAD_TASK_TTL_HOURS * 60 * 60 * 1000,
  maxChunkBytes: Math.max(...ALLOWED_CHUNK_SIZES),
} as const;

/** 文件上传的目录结构划分 */
export const fileUploadPaths = {
  root: uploadRoot,
  temp: path.join(uploadRoot, "temp"),
  multerTemp: path.join(uploadRoot, "temp_multer"),
  final: path.join(uploadRoot, "uploads"),
} as const;
