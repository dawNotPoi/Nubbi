import request, { requestWithNoJson } from "./request";
import type { FileRecord } from "./file";

export interface InitUploadInstantData {
  needUpload: false;
  file: FileRecord;
}

export interface InitUploadPendingData {
  needUpload: true;
  status: "uploading" | "merging" | "failed";
  uploadId: string;
  uploadedChunks: number[];
  expiresAt: string;
}

export type InitUploadTaskData = InitUploadInstantData | InitUploadPendingData;

export const initUploadTask = (param: {
  fileName: string;
  fileHash: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  folderId?: string;
  mimeType?: string;
}) => request<InitUploadTaskData>("/file/init", param);

export const uploadChunk = (formdata: FormData, signal?: AbortSignal) =>
  requestWithNoJson("/file/uploadchunk", formdata, "post", { signal });

export const mergeChunk = (uploadId: string) =>
  request<FileRecord>("/file/merge", { uploadId });

export interface UploadTaskStatusData {
  uploadId: string;
  fileName: string;
  totalSize: number;
  folderId?: string | null;
  uploadedChunks: number[];
  totalChunks: number;
  chunkSize: number;
  status: "uploading" | "merging" | "completed" | "failed";
  error?: string | null;
  expiresAt: string;
  file?: FileRecord | null;
}

export const getUploadTaskStatus = (uploadId: string) =>
  request<UploadTaskStatusData>(
    `/file/upload/${encodeURIComponent(uploadId)}`,
    undefined,
    "get",
  );

export const cancelUploadTask = (uploadId: string) =>
  request<{ cancelled: boolean }>(
    `/file/upload/${encodeURIComponent(uploadId)}`,
    undefined,
    "delete",
  );
