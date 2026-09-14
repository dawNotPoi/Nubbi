import { httpError } from "@/common/http-error";
import {
  deleteOwnedTargets,
  type DeleteTarget,
} from "@/services/fileManagement/delete";
import { listFiles } from "@/services/fileManagement/list";
import { moveFileBatch, moveFileItem } from "@/services/fileManagement/move";
import { getFileStats } from "@/services/fileManagement/stats";
import type {
  FileListInput,
  MoveBatchInput,
  MoveFileInput,
  MoveTarget,
} from "@/services/fileManagement/input-types";

/** 删除单个文件/文件夹的输入参数 */
type DeleteItemInput = {
  fileId: string;
  kind: DeleteTarget["kind"];
};

/** 批量删除的输入参数 */
type DeleteBatchInput = {
  fileIds?: string[];
  targets?: MoveTarget[];
};

/** 删除结果统计 */
type DeleteResult = {
  deletedFileCount: number;
  deletedFolderCount: number;
  missingFileIds: string[];
  missingFolderIds: string[];
};

/** 批量删除结果统计 */
type DeleteBatchResult = DeleteResult & {
  deletedCount: number;
  deletedIds: string[];
};

/** 没有任何目标被删除时抛出 404 */
const assertAnyDeleted = (result: {
  filesToDelete: unknown[];
  folderIdsToDelete: string[];
}): void => {
  if (!result.filesToDelete.length && !result.folderIdsToDelete.length) {
    throw httpError(404, "File or folder not found");
  }
};

/** 查询文件列表 */
export const getManagedFileList = (
  ownerId: string,
  input: FileListInput,
): ReturnType<typeof listFiles> => listFiles(ownerId, input);

/** 查询当前用户的存储用量与配额 */
export const getManagedFileStats = (
  ownerId: string,
): ReturnType<typeof getFileStats> => getFileStats(ownerId);

/** 移动单个文件/文件夹 */
export const moveManagedItem = (
  ownerId: string,
  input: MoveFileInput,
): ReturnType<typeof moveFileItem> => moveFileItem(ownerId, input);

/** 批量移动文件/文件夹 */
export const moveManagedBatch = (
  ownerId: string,
  input: MoveBatchInput,
): ReturnType<typeof moveFileBatch> => moveFileBatch(ownerId, input);

/** 删除单个文件/文件夹，统计删除结果 */
export const deleteManagedItem = async (
  ownerId: string,
  input: DeleteItemInput,
): Promise<DeleteResult> => {
  const result = await deleteOwnedTargets(ownerId, [
    { id: input.fileId, kind: input.kind },
  ]);
  assertAnyDeleted(result);
  return {
    deletedFileCount: result.filesToDelete.length,
    deletedFolderCount: result.folderIdsToDelete.length,
    missingFileIds: result.missingFileIds,
    missingFolderIds: result.missingFolderIds,
  };
};

/** 批量删除文件/文件夹，合并 targets 和 fileIds 两种输入 */
export const deleteManagedBatch = async (
  ownerId: string,
  input: DeleteBatchInput,
): Promise<DeleteBatchResult> => {
  const targets: DeleteTarget[] = [
    ...(input.targets ?? []),
    ...(input.fileIds ?? []).map((id) => ({ id, kind: "file" as const })),
  ];
  const result = await deleteOwnedTargets(ownerId, targets);
  assertAnyDeleted(result);
  const deletedIds = [
    ...result.filesToDelete.map(({ _id }) => String(_id)),
    ...result.folderIdsToDelete,
  ];

  return {
    deletedCount: deletedIds.length,
    deletedFileCount: result.filesToDelete.length,
    deletedFolderCount: result.folderIdsToDelete.length,
    deletedIds,
    missingFileIds: result.missingFileIds,
    missingFolderIds: result.missingFolderIds,
  };
};
