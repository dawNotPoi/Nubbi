import type { InitUploadInput } from "./schemas";

export const buildInstantFileFilter = (
  ownerId: string,
  input: Pick<InitUploadInput, "fileHash" | "totalSize">,
) => ({
  ownerId,
  hash: input.fileHash,
  size: input.totalSize,
  status: "active",
} as const);
