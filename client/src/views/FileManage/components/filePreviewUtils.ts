import type { FileTableRow } from "./FileListTable/fileIcons";

const ARCHIVE_EXTENSIONS = new Set([
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "bz2",
  "xz",
  "tgz",
]);

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "avif",
  "tiff",
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "m4v",
  "flv",
  "wmv",
]);

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "ogg",
  "flac",
  "aac",
  "m4a",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "css",
  "scss",
  "less",
  "html",
  "htm",
  "xml",
  "yml",
  "yaml",
  "csv",
  "log",
  "sql",
  "sh",
  "bat",
  "ps1",
  "java",
  "kt",
  "go",
  "rs",
  "py",
  "rb",
  "php",
  "c",
  "cc",
  "cpp",
  "h",
  "hpp",
  "vue",
  "svelte",
  "ini",
  "conf",
  "properties",
]);

const WORD_EXTENSIONS = new Set(["doc", "docx", "odt"]);
const SHEET_EXTENSIONS = new Set(["xls", "xlsx", "ods"]);
const SLIDE_EXTENSIONS = new Set(["ppt", "pptx", "odp"]);

export type PreviewCategory =
  | "archive"
  | "image"
  | "pdf"
  | "word"
  | "sheet"
  | "slide"
  | "video"
  | "audio"
  | "text"
  | "other";

export const getFileExtension = (name?: string) => {
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
};

export const getRecordMimeType = (
  record?: Pick<FileTableRow, "kind" | "type"> | null,
) => {
  if (!record || record.kind !== "file") return "";
  return record.type?.toLowerCase().trim() ?? "";
};

export const normalizeMimeType = (mimeType?: string) =>
  (mimeType || "").toLowerCase().split(";")[0].trim();

export const resolveFileMimeType = (
  record?: Pick<FileTableRow, "kind" | "type"> | null,
  responseContentType?: string,
) => normalizeMimeType(responseContentType) || getRecordMimeType(record);

export const isArchiveFile = (
  record: FileTableRow,
  responseContentType?: string,
) => {
  const extension = getFileExtension(record.name);
  const mimeType = resolveFileMimeType(record, responseContentType);

  return (
    mimeType.includes("zip") ||
    mimeType.includes("compressed") ||
    mimeType.includes("x-rar") ||
    ARCHIVE_EXTENSIONS.has(extension)
  );
};

export const isImageFile = (
  record: FileTableRow,
  responseContentType?: string,
) => {
  const extension = getFileExtension(record.name);
  const mimeType = resolveFileMimeType(record, responseContentType);

  return (
    mimeType.startsWith("image/") ||
    mimeType.includes("svg") ||
    IMAGE_EXTENSIONS.has(extension)
  );
};

export const getPreviewCategory = (
  record: FileTableRow,
  responseContentType?: string,
): PreviewCategory => {
  const extension = getFileExtension(record.name);
  const mimeType = resolveFileMimeType(record, responseContentType);

  if (isArchiveFile(record, responseContentType)) {
    return "archive";
  }

  if (isImageFile(record, responseContentType)) {
    return "image";
  }

  if (mimeType === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (mimeType.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  if (mimeType.startsWith("audio/") || AUDIO_EXTENSIONS.has(extension)) {
    return "audio";
  }

  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("javascript") ||
    mimeType.includes("markdown") ||
    TEXT_EXTENSIONS.has(extension)
  ) {
    return "text";
  }

  if (WORD_EXTENSIONS.has(extension)) {
    return "word";
  }

  if (SHEET_EXTENSIONS.has(extension)) {
    return "sheet";
  }

  if (SLIDE_EXTENSIONS.has(extension)) {
    return "slide";
  }

  return "other";
};

export const isArchivePreviewBlocked = (record: FileTableRow) =>
  isArchiveFile(record);
