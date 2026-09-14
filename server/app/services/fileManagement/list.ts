import { httpError } from "@/common/http-error";
import { buildPaginationResult } from "@/common/pagination";
import type { PaginationResult } from "@/common/pagination";
import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import {
  buildCategoryFilter,
  buildPageSlices,
  buildStableSort,
  escapeSearchText,
} from "./listFilters";
import type { FileListInput } from "./input-types";

type MongoFilter = Record<string, unknown>;

type FolderDocument = {
  _id: unknown;
  name: string;
  parentId?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
};

type FileDocument = FolderDocument & {
  extension?: string;
  mimeType?: string;
  size: number;
  folderId?: unknown;
};

export type FileBreadcrumb = { _id: string | null; name: string };
export type FolderListItem = {
  _id: string;
  kind: "folder";
  name: string;
  parentId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type FileListItem = {
  _id: string;
  kind: "file";
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type FileListResult = PaginationResult<
  FolderListItem | FileListItem
> & {
  breadcrumbs: FileBreadcrumb[];
};

export const serializeFolderItem = (
  folder: FolderDocument,
): FolderListItem => ({
  _id: String(folder._id),
  kind: "folder" as const,
  name: folder.name,
  parentId: folder.parentId ? String(folder.parentId) : null,
  createdAt: folder.createdAt ?? null,
  updatedAt: folder.updatedAt ?? null,
});

export const serializeFileItem = (file: FileDocument): FileListItem => ({
  _id: String(file._id),
  kind: "file" as const,
  name: file.name,
  extension: file.extension ?? "",
  mimeType: file.mimeType ?? "application/octet-stream",
  size: file.size,
  folderId: file.folderId ? String(file.folderId) : null,
  createdAt: file.createdAt ?? null,
  updatedAt: file.updatedAt ?? null,
});

const getBreadcrumbs = async (
  ownerId: string,
  parentId: string | null,
): Promise<FileBreadcrumb[]> => {
  const breadcrumbs: FileBreadcrumb[] = [
    { _id: null, name: "全部文件" },
  ];
  if (!parentId) return breadcrumbs;

  const ancestors: FileBreadcrumb[] = [];
  const visited = new Set<string>();
  let currentId: string | null = parentId;

  while (currentId) {
    if (visited.has(currentId) || visited.size >= 200) {
      throw httpError(409, "文件夹层级存在循环，无法生成路径");
    }
    visited.add(currentId);

    const folder = (await Folder.findOne({ _id: currentId, ownerId })
      .select("_id name parentId")
      .lean()) as FolderDocument | null;
    if (!folder) {
      throw httpError(404, "当前文件夹不存在或无权访问");
    }
    ancestors.push({ _id: String(folder._id), name: folder.name });
    currentId = folder.parentId ? String(folder.parentId) : null;
  }

  return breadcrumbs.concat(ancestors.reverse());
};

const buildNameFilter = (query: string): MongoFilter =>
  query
    ? { name: { $regex: escapeSearchText(query), $options: "i" } }
    : {};

export const listFiles = async (
  ownerId: string,
  input: FileListInput,
): Promise<FileListResult> => {
  const { parentId, category, query, limit, offset, sortBy, sortOrder } = input;
  const includeFolders = category === "all" || category === "folder";
  const includeFiles = category !== "folder";
  const nameFilter = buildNameFilter(query);
  const folderFilter: MongoFilter = {
    ownerId,
    parentId,
    ...nameFilter,
  };
  const fileFilter: MongoFilter = {
    ownerId,
    folderId: parentId,
    status: "active",
    ...nameFilter,
    ...buildCategoryFilter(category),
  };

  const [breadcrumbs, folderCount, fileCount] = await Promise.all([
    getBreadcrumbs(ownerId, parentId),
    includeFolders ? Folder.countDocuments(folderFilter) : 0,
    includeFiles ? File.countDocuments(fileFilter) : 0,
  ]);
  const slices = buildPageSlices(folderCount, offset, limit);
  const sort = buildStableSort(sortBy, sortOrder);

  const [folders, files] = await Promise.all([
    slices.folderLimit > 0
      ? Folder.find(folderFilter)
          .select("_id name parentId createdAt updatedAt")
          .sort(sort)
          .skip(slices.folderSkip)
          .limit(slices.folderLimit)
          .lean()
      : [],
    slices.fileLimit > 0 && includeFiles
      ? File.find(fileFilter)
          .select("_id name extension mimeType size folderId createdAt updatedAt")
          .sort(sort)
          .skip(slices.fileSkip)
          .limit(slices.fileLimit)
          .lean()
      : [],
  ]);
  const items = [
    ...(folders as FolderDocument[]).map(serializeFolderItem),
    ...(files as FileDocument[]).map(serializeFileItem),
  ];

  return {
    ...buildPaginationResult(items, folderCount + fileCount, { limit, offset }),
    breadcrumbs,
  };
};
