import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import path from "path";
import { withFileFolderStructureLock } from "./structureLock";

const httpError = (status: number, message: string): Error =>
  Object.assign(new Error(message), { status });

const assertOwnedParent = async (
  ownerId: string | undefined,
  parentId: unknown,
): Promise<void> => {
  if (!parentId) return;
  const exists = await Folder.exists({ _id: parentId, ownerId });
  if (!exists) throw httpError(404, "父文件夹不存在或无权访问");
};

export const listFilesLegacy = async (
  ownerId: string | undefined,
  parentId: unknown,
) => {
  const currentParentId = !parentId || parentId === "root" ? null : parentId;
  await assertOwnedParent(ownerId, currentParentId);
  const [folders, files] = await Promise.all([
    Folder.find({ ownerId, parentId: currentParentId }).sort({ name: 1 }),
    File.find({
      ownerId,
      folderId: currentParentId,
      status: "active",
    }).sort({ createdAt: -1 }),
  ]);
  return { folders, files };
};

export const createFolderLegacy = async (
  ownerId: string | undefined,
  name: unknown,
  parentId: unknown,
) => {
  const create = async () => {
    await assertOwnedParent(ownerId, parentId);
    return Folder.create({ name, parentId: parentId || null, ownerId });
  };
  return ownerId ? withFileFolderStructureLock(ownerId, create) : create();
};

export const getFoldersLegacy = (ownerId: string | undefined) =>
  Folder.find({ ownerId })
    .select("_id name parentId createdAt updatedAt")
    .sort({ name: 1 });

export const renameItemLegacy = async (
  ownerId: string | undefined,
  id: unknown,
  name: string,
  kind: unknown,
) => {
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
