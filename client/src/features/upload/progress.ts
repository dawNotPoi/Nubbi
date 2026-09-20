import { FULL_HASH_THRESHOLD_BYTES } from "./hashPolicy";

/**
 * 抽样哈希不预支上传进度，小文件完整校验保留原有权重。
 * @param fileSize 文件字节数。
 * @returns 校验阶段占用的百分比。
 */
export const getHashProgressWeight = (fileSize: number): number =>
  fileSize >= FULL_HASH_THRESHOLD_BYTES ? 0 : 10;

/**
 * 新上传、续传和刷新恢复共用分片进度口径，保留最后 1% 给合并确认。
 * @param fileSize 文件字节数。
 * @param completedChunks 服务端已确认的分片数。
 * @param totalChunks 文件总分片数。
 * @returns 限制在校验权重至 99% 范围内的进度。
 */
export const getUploadProgress = (
  fileSize: number,
  completedChunks: number,
  totalChunks: number,
): number => {
  const start = getHashProgressWeight(fileSize);
  const fraction = totalChunks > 0
    ? Math.max(0, Math.min(1, completedChunks / totalChunks))
    : 0;
  return Math.min(99, start + Math.round(fraction * (99 - start)));
};
