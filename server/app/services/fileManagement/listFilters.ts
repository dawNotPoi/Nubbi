import type { FileListInput } from "./schemas";

type MongoFilter = Record<string, unknown>;
type SortDirection = 1 | -1;

const extensionFilter = (extensions: string[]): MongoFilter => ({
  extension: {
    $regex: `^\\.?(${extensions.join("|")})$`,
    $options: "i",
  },
});

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

export const escapeSearchText = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const buildCategoryFilter = (
  category: FileListInput["category"],
): MongoFilter => {
  if (category === "all" || category === "folder") return {};
  if (category === "other") {
    return { $nor: Object.values(CATEGORY_FILTERS) };
  }
  return CATEGORY_FILTERS[category];
};

export const buildPageSlices = (
  folderCount: number,
  offset: number,
  limit: number,
) => {
  const folderSkip = Math.min(offset, folderCount);
  const folderLimit = Math.max(0, Math.min(limit, folderCount - folderSkip));
  const fileSkip = Math.max(0, offset - folderCount);
  return { folderSkip, folderLimit, fileSkip, fileLimit: limit - folderLimit };
};

export const buildStableSort = (
  sortBy: FileListInput["sortBy"],
  sortOrder: FileListInput["sortOrder"],
): Record<string, SortDirection> => {
  const direction = sortOrder === "asc" ? 1 : -1;
  return { [sortBy]: direction, _id: direction };
};
