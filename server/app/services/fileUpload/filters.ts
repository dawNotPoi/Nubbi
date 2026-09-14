import type { InitUploadInput } from "./types";

/** 构建秒传检测的文件过滤条件 */
export const buildInstantFileFilter = (
  ownerId: string,
  input: Pick<InitUploadInput, "fileHash" | "totalSize">,
): {
  readonly ownerId: string;
  readonly hash: string;
  readonly size: number;
  readonly status: "active";
} => ({
  ownerId,
  hash: input.fileHash,
  size: input.totalSize,
  status: "active",
} as const);
