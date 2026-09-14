/** 计算指定分片的预期字节数（最后一片按余量计算，非法的索引返回 null） */
export const expectedChunkBytes = (
  totalSize: number,
  chunkSize: number,
  totalChunks: number,
  chunkIndex: number,
): number | null => {
  if (chunkIndex < 0 || chunkIndex >= totalChunks) return null;
  if (chunkIndex < totalChunks - 1) return chunkSize;
  return totalSize - chunkSize * (totalChunks - 1);
};
