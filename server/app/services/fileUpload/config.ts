import env from "@/lib/env";

export const MEBIBYTE = 1024 * 1024;
export const ALLOWED_CHUNK_SIZES = [5, 10, 20].map(
  (size) => size * MEBIBYTE,
);

export const fileUploadConfig = {
  maxFileBytes: env.FILE_UPLOAD_MAX_FILE_BYTES,
  userQuotaBytes: env.FILE_UPLOAD_USER_QUOTA_BYTES,
  maxActiveTasks: env.FILE_UPLOAD_MAX_ACTIVE_TASKS,
  taskTtlMs: env.FILE_UPLOAD_TASK_TTL_HOURS * 60 * 60 * 1000,
  maxChunkBytes: Math.max(...ALLOWED_CHUNK_SIZES),
};
