import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import {
  enqueueStorageCleanup,
  processStorageCleanupUnlocked,
} from "@/services/storageCleanupQueue";
import { collectDescendantFolderIds } from "./moveGraph";
import { withFileFolderStructureLock } from "./structureLock";

/** 删除目标类型 */
export type DeleteTargetKind = "file" | "folder";
export type DeleteTarget = { id: string; kind: DeleteTargetKind };

/** 待删除的文件记录 */
type FileToDelete = { _id: unknown; storagePath: string };
/** 删除目标解析结果 */
export type DeleteTargetsResult = {
  filesToDelete: FileToDelete[];
  folderIdsToDelete: string[];
  missingFileIds: string[];
  missingFolderIds: string[];
};

/** 解析删除目标：展开文件夹的后代，合并文件与嵌套文件 */
const resolveDeleteTargets = async (
  userId: string | undefined,
  targets: DeleteTarget[],
) => {
  const fileIds = [
    ...new Set(targets.filter(({ kind }) => kind === "file").map(({ id }) => id)),
  ];
  const folderIds = [
    ...new Set(targets.filter(({ kind }) => kind === "folder").map(({ id }) => id)),
  ];
  const directFiles = fileIds.length
    ? await File.find({
        _id: { $in: fileIds },
        ownerId: userId,
        status: "active",
      }).select("_id storagePath")
    : [];
  const directFileIds = new Set(directFiles.map(({ _id }) => String(_id)));
  const missingFileIds = fileIds.filter((id) => !directFileIds.has(id));

  if (folderIds.length === 0) {
    return {
      filesToDelete: directFiles as FileToDelete[],
      folderIdsToDelete: [] as string[],
      missingFileIds,
      missingFolderIds: [] as string[],
    };
  }

  const ownedFolders = await Folder.find({ ownerId: userId }).select(
    "_id parentId",
  );
  const nodes = ownedFolders.map((folder) => ({
    _id: String(folder._id),
    parentId: folder.parentId ? String(folder.parentId) : null,
  }));
  const ownedIds = new Set(nodes.map(({ _id }) => _id));
  const foundFolderIds = folderIds.filter((id) => ownedIds.has(id));
  const missingFolderIds = folderIds.filter((id) => !ownedIds.has(id));
  const folderIdsToDelete = new Set<string>();
  for (const folderId of foundFolderIds) {
    folderIdsToDelete.add(folderId);
    for (const childId of collectDescendantFolderIds(nodes, folderId)) {
      folderIdsToDelete.add(childId);
    }
  }

  const nestedFiles = folderIdsToDelete.size
    ? await File.find({
        ownerId: userId,
        status: "active",
        folderId: { $in: [...folderIdsToDelete] },
      }).select("_id storagePath")
    : [];
  const allFiles = new Map<string, FileToDelete>();
  for (const file of [...directFiles, ...nestedFiles]) {
    allFiles.set(String(file._id), {
      _id: String(file._id),
      storagePath: file.storagePath,
    });
  }
  return {
    filesToDelete: [...allFiles.values()],
    folderIdsToDelete: [...folderIdsToDelete],
    missingFileIds,
    missingFolderIds,
  };
};

/** 无锁删除：删除文件记录并入队物理文件清理，级联删除文件夹 */
const deleteOwnedTargetsUnlocked = async (
  userId: string | undefined,
  targets: DeleteTarget[],
) => {
  const resolved = await resolveDeleteTargets(userId, targets);
  const { filesToDelete, folderIdsToDelete } = resolved;
  if (filesToDelete.length) {
    const storagePaths = filesToDelete.map(({ storagePath }) => storagePath);
    if (userId) await enqueueStorageCleanup(userId, storagePaths);
    await File.deleteMany({
      _id: { $in: filesToDelete.map(({ _id }) => _id) },
      ownerId: userId,
      status: "active",
    });
    if (userId) await processStorageCleanupUnlocked(userId, storagePaths);
  }
  if (folderIdsToDelete.length) {
    await Folder.deleteMany({
      _id: { $in: folderIdsToDelete },
      ownerId: userId,
    });
  }
  return resolved;
};

/** 删除归属目标：带目录结构锁保护，空目标直接执行 */
export const deleteOwnedTargets = (
  userId: string | undefined,
  targets: DeleteTarget[],
): Promise<DeleteTargetsResult> => {
  const task = () => deleteOwnedTargetsUnlocked(userId, targets);
  return userId && targets.length > 0
    ? withFileFolderStructureLock(userId, task)
    : task();
};
