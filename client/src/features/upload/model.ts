import type { FileRecord } from "@/api/file";

export enum UploadStatus {
  pending = "pending",
  hashing = "hashing",
  initializing = "initializing",
  uploading = "uploading",
  paused = "paused",
  merging = "merging",
  success = "success",
  fail = "fail",
  needsFile = "needsFile",
  cancelled = "cancelled",
}

export enum ChunkStatus {
  pending = "pending",
  uploading = "uploading",
  success = "success",
}

export interface UploadSnapshot {
  status: UploadStatus;
  progress: number;
  speed: number;
  error?: string;
  uploadId?: string;
}

export interface UploadSession {
  uploadId: string;
  hash: string;
  name: string;
  size: number;
  folderId?: string;
  chunkSize: number;
  totalChunks: number;
  expiresAt: string;
}

export interface UploadCallbacks {
  onChange?: (snapshot: UploadSnapshot) => void;
  onFinish?: (file?: FileRecord) => void;
}

export const isActiveUploadStatus = (status: UploadStatus) =>
  [
    UploadStatus.hashing,
    UploadStatus.initializing,
    UploadStatus.uploading,
    UploadStatus.paused,
    UploadStatus.merging,
  ].includes(status);
