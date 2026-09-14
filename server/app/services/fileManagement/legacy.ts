import { httpError } from "@/common/http-error";
import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import path from "path";
import { withFileFolderStructureLock } from "./structureLock";

/** 旧版接口的文件夹/文件文档类型 */
type LegacyFolderDocument = InstanceType<typeof Folder>;
type LegacyFileDocument = InstanceType<typeof File>;

export type LegacyFileListResult = {
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

/** 旧版文件列表查询（兼容旧客户端） */
export const listFilesLegacy = async (
  ownerId: string | undefined,
  parentId: unknown,
): Promise<LegacyFileListResult> => {
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

/** 旧版查询全部文件夹 */
export const getFoldersLegacy = (
  ownerId: string | undefined,
): ReturnType<typeof Folder.find> =>
  Folder.find({ ownerId })
    .select("_id name parentId createdAt updatedAt")
    .sort({ name: 1 });

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
