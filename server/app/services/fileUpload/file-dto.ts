import type { UploadedFileDto } from "./types";

/** 上传文件的数据库记录源类型 */
type UploadedFileSource = {
  _id?: unknown;
  name?: unknown;
  extension?: unknown;
  mimeType?: unknown;
  size?: unknown;
  folderId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  toObject?: () => Record<string, unknown>;
};

/** 安全地读取可选字符串字段 */
const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value ? value : undefined;

/** 安全地读取可选日期字段，无效日期返回 undefined */
const optionalDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** 文件上传接口只返回客户端需要的公开字段。 */
export const serializeUploadedFile = (
  value: unknown,
): UploadedFileDto => {
  const source = value as UploadedFileSource;
  const item =
    typeof source.toObject === "function" ? source.toObject() : source;

  return {
    _id: String(item._id),
    name: typeof item.name === "string" ? item.name : "",
    extension: optionalString(item.extension),
    mimeType: optionalString(item.mimeType),
    size: typeof item.size === "number" ? item.size : 0,
    folderId: item.folderId ? String(item.folderId) : null,
    createdAt: optionalDate(item.createdAt),
    updatedAt: optionalDate(item.updatedAt),
  };
};
