import request, { Get } from "./request";
import type { PaginatedResult } from "./pagination";
import { accountQueryKey } from "@/features/auth/model/account-scope";

export type FileItemKind = "file" | "folder";
export type FileCategory =
  | "all"
  | "folder"
  | "document"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "other";
export type FileSortBy = "name" | "updatedAt";
export type FileSortOrder = "asc" | "desc";

export interface FolderRecord {
  _id: string;
  name: string;
  parentId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface FileRecord {
  _id: string;
  name: string;
  extension?: string;
  mimeType?: string;
  size?: number | string;
  folderId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface FileFolderItem {
  _id: string;
  kind: "folder";
  name: string;
  parentId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FileEntryItem {
  _id: string;
  kind: "file";
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type FileListItem =
  | FileFolderItem
  | FileEntryItem;

export interface FileBreadcrumb {
  _id: string | null;
  name: string;
}

/** 文件页存储用量统计 */
export interface FileStats {
  usedBytes: number;
  reservedBytes: number;
  quotaBytes: number;
  fileCount: number;
  folderCount: number;
}

export interface FileListData extends PaginatedResult<FileListItem> {
  breadcrumbs: FileBreadcrumb[];
}

export interface FileListParams extends Record<string, unknown> {
  parentId?: string;
  limit?: number;
  offset?: number;
  query?: string;
  category?: FileCategory;
  sortBy?: FileSortBy;
  sortOrder?: FileSortOrder;
}

export type FileTarget = { id: string; kind: FileItemKind };

export interface BatchMoveResult {
  moved: Array<FileTarget & { targetFolderId: string | null }>;
  skipped: Array<FileTarget & { reason: string }>;
  failed: Array<FileTarget & { reason: string }>;
}

export const FILE_LIST_QUERY_KEY = "file-list";
export const FILE_STATS_QUERY_KEY = "file-stats";
/** @param ownerId 当前账号 ID。@returns 当前账号全部文件列表的 key 前缀。 */
export const fileListQueryRoot = (ownerId: string) =>
  accountQueryKey(ownerId, [FILE_LIST_QUERY_KEY] as const);

/** @param ownerId 当前账号 ID。@param parentId 目录 ID。@returns 目录查询 key。 */
export const fileDirectoryQueryKey = (
  ownerId: string,
  parentId?: string | null,
) => accountQueryKey(ownerId, [FILE_LIST_QUERY_KEY, parentId ?? "root"] as const);

/** @param ownerId 当前账号 ID。@returns 当前账号存储用量 key。 */
export const fileStatsQueryKey = (ownerId: string) =>
  accountQueryKey(ownerId, [FILE_STATS_QUERY_KEY] as const);

export const listFiles = async (params: FileListParams = {}) => {
  const response = await Get<FileListData>("/file/list", params);
  if (response.code !== 1) {
    throw new Error(response.message || "文件列表加载失败");
  }
  return response;
};

/** 读取当前用户的存储用量与配额 */
export const fetchFileStats = async () => {
  const response = await Get<FileStats>("/file/stats");
  if (response.code !== 1) {
    throw new Error(response.message || "存储用量加载失败");
  }
  return response.data;
};

export const createFloder = (name?: string, parentId?: string) =>
  request<FolderRecord>("/file/createfolder", { parentId, name });

export const getAllFolders = () =>
  request<FolderRecord[]>("/file/folders", undefined, "get");

export const deleteFile = (
  _id: string,
  kind: FileItemKind = "file",
) => request("/file/delete", { fileId: _id, kind }, "post");

export const deleteTargetsBatch = (targets: FileTarget[]) =>
  request<{
    deletedCount: number;
    deletedFileCount: number;
    deletedFolderCount: number;
    deletedIds: string[];
    missingFileIds: string[];
    missingFolderIds: string[];
  }>("/file/delete-batch", { targets }, "post");

export const deleteFilesBatch = (fileIds: string[]) =>
  deleteTargetsBatch(fileIds.map((id) => ({ id, kind: "file" })));

export const renameFile = (
  _id: string,
  name: string,
  kind: FileItemKind = "file",
) => request("/file/rename", { _id, name, kind });

export const moveFileItem = (
  _id: string,
  targetFolderId: string | null,
  kind: FileItemKind,
) => request("/file/move", { _id, targetFolderId, kind });

export const moveFileItemsBatch = (
  targets: FileTarget[],
  targetFolderId: string | null,
) => request<BatchMoveResult>(
  "/file/move-batch",
  { targets, targetFolderId },
  "post",
);

export * from "./fileAccess";
export * from "./fileUpload";
