import { httpError } from "@/common/http-error";
import {
  deleteOwnedTargets,
  type DeleteTarget,
} from "@/services/fileManagement/delete";
import { listFiles } from "@/services/fileManagement/list";
import { moveFileBatch, moveFileItem } from "@/services/fileManagement/move";
import type {
  FileListInput,
  MoveBatchInput,
  MoveFileInput,
  MoveTarget,
} from "@/services/fileManagement/input-types";

type DeleteItemInput = {
  fileId: string;
  kind: DeleteTarget["kind"];
};

type DeleteBatchInput = {
  fileIds?: string[];
  targets?: MoveTarget[];
};

type DeleteResult = {
  deletedFileCount: number;
  deletedFolderCount: number;
  missingFileIds: string[];
  missingFolderIds: string[];
};

type DeleteBatchResult = DeleteResult & {
  deletedCount: number;
  deletedIds: string[];
};

const assertAnyDeleted = (result: {
  filesToDelete: unknown[];
  folderIdsToDelete: string[];
}): void => {
  if (!result.filesToDelete.length && !result.folderIdsToDelete.length) {
    throw httpError(404, "File or folder not found");
  }
};

export const getManagedFileList = (
  ownerId: string,
  input: FileListInput,
): ReturnType<typeof listFiles> => listFiles(ownerId, input);

export const moveManagedItem = (
  ownerId: string,
  input: MoveFileInput,
): ReturnType<typeof moveFileItem> => moveFileItem(ownerId, input);

export const moveManagedBatch = (
  ownerId: string,
  input: MoveBatchInput,
): ReturnType<typeof moveFileBatch> => moveFileBatch(ownerId, input);

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
