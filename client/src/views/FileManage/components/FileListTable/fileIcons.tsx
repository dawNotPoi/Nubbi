import type { FileRecord, FolderRecord } from "@/api/file";
import {
  Archive,
  FileText,
  Folder,
  ImageIcon,
  Video,
} from "lucide-react";

export type FileTableRow =
  | (FolderRecord & { kind: "folder" })
  | (FileRecord & { kind: "file" });

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

const getFileExtension = (name?: string) => {
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
};

export const getFileTypeIcon = (record: FileTableRow) => {
  if (record.kind === "folder") {
    return <Folder className="h-5 w-5 flex-shrink-0 text-amber-500" />;
  }

  const extension = getFileExtension(record.name);
  const mimeType = record.type?.toLowerCase() ?? "";

  if (mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return <ImageIcon className="h-5 w-5 flex-shrink-0 text-emerald-500" />;
  }

  if (mimeType.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) {
    return <Video className="h-5 w-5 flex-shrink-0 text-violet-500" />;
  }

  if (
    mimeType.includes("zip") ||
    mimeType.includes("compressed") ||
    ARCHIVE_EXTENSIONS.has(extension)
  ) {
    return <Archive className="h-5 w-5 flex-shrink-0 text-orange-500" />;
  }

  return <FileText className="h-5 w-5 flex-shrink-0 text-slate-500" />;
};
