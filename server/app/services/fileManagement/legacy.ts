import { buildPaginationResult, type PaginationInput, type PaginationResult } from "@/common/pagination";
import { buildPageSlices } from "./listFilters";
import { httpError } from "@/common/http-error";
import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import path from "path";
import { withFileFolderStructureLock } from "./structureLock";

/** 旧版接口的文件夹/文件文档类型 */
type LegacyFolderDocument = InstanceType<typeof Folder>;
type LegacyFileDocument = InstanceType<typeof File>;

export type LegacyFileListResult = PaginationResult<LegacyFolderDocument | LegacyFileDocument> & {
  folders: LegacyFolderDocument[];
  files: LegacyFileDocument[];
};

/** 校验父文件夹存在且归属正确 */
const assertOwnedParent = async (
  ownerId: string | undefined,
  parentId: unknown,
): Promise<void> => {
  if (!parentId) return;
  const exists = await Folder.exists({ _id: parentId, ownerId });
  if (!exists) throw httpError(404, "父文件夹不存在或无权访问");
};

/** @param ownerId 账号。@param parentId 目录。@param pagination 分页参数。@returns 文件夹优先的混合页，保留当页分类。 */
export const listFilesLegacy = async (
  ownerId: string,
  parentId: string | null,
  pagination: PaginationInput,
): Promise<LegacyFileListResult> => {
  await assertOwnedParent(ownerId, parentId);
  const folderFilter = { ownerId, parentId };
  const fileFilter = { ownerId, folderId: parentId, status: "active" };
  const [folderCount, fileCount] = await Promise.all([
    Folder.countDocuments(folderFilter), File.countDocuments(fileFilter),
  ]);
  const slices = buildPageSlices(folderCount, pagination.offset, pagination.limit);
  const [folders, files] = await Promise.all([
    slices.folderLimit > 0 ? Folder.find(folderFilter).sort({ name: 1, _id: 1 })
      .skip(slices.folderSkip).limit(slices.folderLimit) : [],
    slices.fileLimit > 0 ? File.find(fileFilter).sort({ createdAt: -1, _id: -1 })
      .skip(slices.fileSkip).limit(slices.fileLimit) : [],
  ]);
  return { ...buildPaginationResult<LegacyFolderDocument | LegacyFileDocument>([...folders, ...files], folderCount + fileCount, pagination), folders, files };
};

/** 旧版创建文件夹 */
export const createFolderLegacy = async (
  ownerId: string | undefined,
  name: unknown,
  parentId: unknown,
): Promise<LegacyFolderDocument> => {
  const create = async () => {
    await assertOwnedParent(ownerId, parentId);
    return Folder.create({ name, parentId: parentId || null, ownerId });
  };
  return ownerId ? withFileFolderStructureLock(ownerId, create) : create();
};

/** @param ownerId 账号。@param pagination 分页参数。@returns 文件夹目录分页。 */
export const getFoldersLegacy = async (
  ownerId: string,
  pagination: PaginationInput,
): Promise<PaginationResult<LegacyFolderDocument>> => {
  const [items, total] = await Promise.all([
    Folder.find({ ownerId }).select("_id name parentId createdAt updatedAt")
      .sort({ name: 1, _id: 1 }).skip(pagination.offset).limit(pagination.limit),
    Folder.countDocuments({ ownerId }),
  ]);
  return buildPaginationResult(items, total, pagination);
};

/** 旧版重命名文件/文件夹 */
export const renameItemLegacy = async (
  ownerId: string | undefined,
  id: unknown,
  name: string,
  kind: unknown,
): Promise<LegacyFolderDocument | LegacyFileDocument | null> => {
  if (kind === "folder") {
    return Folder.findOneAndUpdate(
      { _id: id, ownerId },
      { $set: { name } },
      { new: true },
    );
  }
  return File.findOneAndUpdate(
    { _id: id, ownerId, status: "active" },
    { $set: { name, extension: path.extname(name) } },
    { new: true },
  );
};
