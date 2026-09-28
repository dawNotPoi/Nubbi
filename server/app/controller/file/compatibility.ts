import type { PaginationInput } from "@/common/pagination";
import { httpError } from "@/common/http-error";
import {
  createFolderLegacy,
  getFoldersLegacy,
  listFilesLegacy,
  renameItemLegacy,
} from "@/services/fileManagement/legacy";

/** @param ownerId 账号。@param parentId 目录。@param pagination 分页参数。@returns 文件列表当前页。 */
export const getLegacyFileList = (
  ownerId: string,
  parentId: string | null,
  pagination: PaginationInput,
): ReturnType<typeof listFilesLegacy> => listFilesLegacy(ownerId, parentId, pagination);

export const createLegacyFolder = (
  ownerId: string,
  name: string,
  parentId: string | null,
): ReturnType<typeof createFolderLegacy> =>
  createFolderLegacy(ownerId, name, parentId);

/** @param ownerId 账号。@param pagination 分页参数。@returns 文件夹当前页。 */
export const getLegacyFolders = (
  ownerId: string,
  pagination: PaginationInput,
): ReturnType<typeof getFoldersLegacy> => getFoldersLegacy(ownerId, pagination);

export const renameLegacyItem = async (
  ownerId: string,
  itemId: string,
  name: string,
  kind: "file" | "folder",
): Promise<NonNullable<Awaited<ReturnType<typeof renameItemLegacy>>>> => {
  const result = await renameItemLegacy(ownerId, itemId, name, kind);
  if (!result) throw httpError(404, "File or folder not found");
  return result;
};
