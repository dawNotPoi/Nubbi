import type { FileListInput } from "./input-types";

type MongoFilter = Record<string, unknown>;
type SortDirection = 1 | -1;

export type PageSlices = {
  folderSkip: number;
  folderLimit: number;
  fileSkip: number;
  fileLimit: number;
};

/** 扩展名过滤条件 */
const extensionFilter = (extensions: string[]): MongoFilter => ({
  extension: {
    $regex: `^\\.?(${extensions.join("|")})$`,
    $options: "i",
  },
});

/** 按分类预置的过滤条件（文档/图片/视频/音频/压缩包） */
const CATEGORY_FILTERS = {
  document: {
    $or: [
      extensionFilter([
        "pdf",
        "docx?",
        "xlsx?",
        "pptx?",
        "txt",
        "md",
        "csv",
        "rtf",
        "od[stp]",
      ]),
      { mimeType: { $regex: "^(text/|application/pdf)", $options: "i" } },
    ],
  },
  image: {
    $or: [
      { mimeType: { $regex: "^image/", $options: "i" } },
      extensionFilter(["jpe?g", "png", "gif", "webp", "svg", "bmp", "ico"]),
    ],
  },
  video: {
    $or: [
      { mimeType: { $regex: "^video/", $options: "i" } },
      extensionFilter(["mp4", "mov", "avi", "mkv", "webm", "m4v"]),
    ],
  },
  audio: {
    $or: [
      { mimeType: { $regex: "^audio/", $options: "i" } },
      extensionFilter(["mp3", "wav", "flac", "aac", "m4a", "ogg"]),
    ],
  },
  archive: extensionFilter(["zip", "rar", "7z", "tar", "gz", "bz2", "xz"]),
} satisfies Record<string, MongoFilter>;

/** 转义搜索文本中的正则特殊字符 */
export const escapeSearchText = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 构建分类过滤条件（other 为不属于任何预置分类） */
export const buildCategoryFilter = (
  category: FileListInput["category"],
): MongoFilter => {
  if (category === "all" || category === "folder") return {};
  if (category === "other") {
    return { $nor: Object.values(CATEGORY_FILTERS) };
  }
  return CATEGORY_FILTERS[category];
};

/** 在文件夹和文件之间分配分页切片 */
export const buildPageSlices = (
  folderCount: number,
  offset: number,
  limit: number,
): PageSlices => {
  const folderSkip = Math.min(offset, folderCount);
  const folderLimit = Math.max(0, Math.min(limit, folderCount - folderSkip));
  const fileSkip = Math.max(0, offset - folderCount);
  return { folderSkip, folderLimit, fileSkip, fileLimit: limit - folderLimit };
};

/** 构建稳定的排序条件（附带 _id 作为唯一性兜底） */
export const buildStableSort = (
  sortBy: FileListInput["sortBy"],
  sortOrder: FileListInput["sortOrder"],
): Record<string, SortDirection> => {
  const direction = sortOrder === "asc" ? 1 : -1;
  return { [sortBy]: direction, _id: direction };
};
