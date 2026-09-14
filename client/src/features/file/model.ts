import type {
  FileCategory,
  FileListItem,
  FileSortBy,
  FileSortOrder,
} from "@/api/file";
import dayjs from "dayjs";

export const FILE_PAGE_SIZE = 20;
export const DEFAULT_FOLDER_NAME = "新建文件夹";

export type FileSortMode =
  | "updated-desc"
  | "updated-asc"
  | "name-asc"
  | "name-desc";

/** 行选择时的修饰键状态 */
export type FileSelectModifiers = {
  shiftKey?: boolean;
  toggleKey?: boolean;
};

export const CATEGORY_OPTIONS: Array<{ value: FileCategory; label: string }> = [
  { value: "all", label: "全部类型" },
  { value: "folder", label: "文件夹" },
  { value: "document", label: "文档" },
  { value: "image", label: "图片" },
  { value: "video", label: "视频" },
  { value: "audio", label: "音频" },
  { value: "archive", label: "压缩包" },
  { value: "other", label: "其他" },
];

export const SORT_OPTIONS: Array<{ value: FileSortMode; label: string }> = [
  { value: "updated-desc", label: "最近修改" },
  { value: "updated-asc", label: "最早修改" },
  { value: "name-asc", label: "名称 A–Z" },
  { value: "name-desc", label: "名称 Z–A" },
];

export const resolveSort = (mode: FileSortMode): {
  sortBy: FileSortBy;
  sortOrder: FileSortOrder;
} => {
  const [field, order] = mode.split("-") as ["updated" | "name", FileSortOrder];
  return { sortBy: field === "updated" ? "updatedAt" : "name", sortOrder: order };
};

export const formatFileSize = (rawSize?: number | string) => {
  const size = Number(rawSize);
  if (!Number.isFinite(size) || size < 0) return "—";
  if (size === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), 4);
  const value = size / 1024 ** index;
  return `${Number(value.toFixed(value >= 10 || index === 0 ? 0 : 1))} ${units[index]}`;
};

export const formatFileDate = (value?: string | null) => {
  if (!value) return "—";
  const date = dayjs(value);
  if (!date.isValid()) return "—";
  const today = dayjs();
  if (date.isSame(today, "day")) return `今天 ${date.format("HH:mm")}`;
  if (date.isSame(today.subtract(1, "day"), "day")) {
    return `昨天 ${date.format("HH:mm")}`;
  }
  return date.year() === today.year()
    ? date.format("M 月 D 日")
    : date.format("YYYY-MM-DD");
};

/** 时间列的完整时间戳，用作悬停提示 */
export const formatFileFullDate = (value?: string | null) => {
  if (!value) return "";
  const date = dayjs(value);
  return date.isValid() ? date.format("YYYY-MM-DD HH:mm:ss") : "";
};

/** 把文件名拆成主名与扩展名，便于主名省略时仍保留扩展名 */
export const splitFileName = (name: string): { base: string; extension: string } => {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === name.length - 1) {
    return { base: name, extension: "" };
  }
  return {
    base: name.slice(0, lastDot),
    extension: name.slice(lastDot + 1),
  };
};

export const getFileTypeLabel = (item: FileListItem) => {
  if (item.kind === "folder") return "文件夹";
  const storedExtension = item.extension?.replace(/^\./, "").trim() ?? "";
  const lastDot = item.name.lastIndexOf(".");
  const nameExtension = lastDot > 0 && lastDot < item.name.length - 1
    ? item.name.slice(lastDot + 1)
    : "";
  const extension = storedExtension || nameExtension;
  return extension ? extension.toUpperCase() : "文件";
};

export const getFileTypeAndSize = (item: FileListItem) =>
  item.kind === "folder"
    ? "文件夹"
    : `${getFileTypeLabel(item)} · ${formatFileSize(item.size)}`;

export const getFileMobileMeta = (item: FileListItem) =>
  `${getFileTypeAndSize(item)} · ${formatFileDate(item.updatedAt)}`;

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

export const saveBlobAsFile = (blob: Blob, fileName: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};
