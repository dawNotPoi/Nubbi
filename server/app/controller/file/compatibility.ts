import { httpError } from "@/common/http-error";
import {
  createFolderLegacy,
  getFoldersLegacy,
  listFilesLegacy,
  renameItemLegacy,
} from "@/services/fileManagement/legacy";

export const getLegacyFileList = (
  ownerId: string,
  parentId: string | null,
): ReturnType<typeof listFilesLegacy> => listFilesLegacy(ownerId, parentId);

export const createLegacyFolder = (
  ownerId: string,
  name: string,
  parentId: string | null,
): ReturnType<typeof createFolderLegacy> =>
  createFolderLegacy(ownerId, name, parentId);

export const getLegacyFolders = (
  ownerId: string,
): ReturnType<typeof getFoldersLegacy> => getFoldersLegacy(ownerId);

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
