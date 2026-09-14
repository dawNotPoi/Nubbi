import type { FileListItem as FileTableRow } from "@/api/file";
import {
  ARCHIVE_EXTENSIONS,
  AUDIO_EXTENSIONS,
  IMAGE_EXTENSIONS,
  SHEET_EXTENSIONS,
  SLIDE_EXTENSIONS,
  TEXT_EXTENSIONS,
  VIDEO_EXTENSIONS,
  WORD_EXTENSIONS,
} from "./filePreviewConstants";

type FilePreviewRecord = Extract<FileTableRow, { kind: "file" }>;

const isFilePreviewRecord = (
  record?: FileTableRow | null,
): record is FilePreviewRecord => record?.kind === "file";

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
  record?: FileTableRow | null,
) => {
  if (!isFilePreviewRecord(record)) return "";
  return record.mimeType?.toLowerCase().trim() ?? "";
};

export const normalizeMimeType = (mimeType?: string) =>
  (mimeType || "").toLowerCase().split(";")[0].trim();

export const resolveFileMimeType = (
  record?: FileTableRow | null,
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
