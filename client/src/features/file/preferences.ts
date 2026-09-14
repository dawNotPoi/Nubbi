import type { FileCategory } from "@/api/file";
import type { FileSortMode } from "./model";

/** 文件页在浏览器本地持久化的浏览偏好 */
export interface FilePreferences {
  category: FileCategory;
  sortMode: FileSortMode;
}

const STORAGE_KEY = "nubbi_file_preferences";

const CATEGORIES: FileCategory[] = [
  "all",
  "folder",
  "document",
  "image",
  "video",
  "audio",
  "archive",
  "other",
];

const SORT_MODES: FileSortMode[] = [
  "updated-desc",
  "updated-asc",
  "name-asc",
  "name-desc",
];

/**
 * 读取上次使用的排序方式与类型筛选，非法或缺失时返回 null。
 * @returns 合法偏好，或 null 表示使用默认值。
 */
export const readFilePreferences = (): FilePreferences | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FilePreferences>;
    if (
      !parsed.category ||
      !CATEGORIES.includes(parsed.category) ||
      !parsed.sortMode ||
      !SORT_MODES.includes(parsed.sortMode)
    ) {
      return null;
    }
    return { category: parsed.category, sortMode: parsed.sortMode };
  } catch {
    return null;
  }
};

/**
 * 合并写入浏览偏好，写入失败时静默忽略，不影响页面功能。
 * @param update 需要更新的偏好字段。
 * @returns 无返回值。
 */
export const writeFilePreferences = (update: Partial<FilePreferences>): void => {
  if (typeof window === "undefined") return;
  try {
    const current = readFilePreferences() ?? {
      category: "all" as FileCategory,
      sortMode: "updated-desc" as FileSortMode,
    };
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, ...update }),
    );
  } catch {
    // 本地存储不可用时忽略，偏好仅在本次会话内生效
  }
};
