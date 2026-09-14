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
