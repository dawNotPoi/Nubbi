import type { AuthRequest } from "@/middleware/common";
import {
  deleteOwnedTargets,
  type DeleteTarget,
  type DeleteTargetKind,
} from "@/services/fileManagement/delete";
import type { Response } from "express";
import { successResponse } from "@/routes/utils";

const notFound = (res: Response) =>
  res.status(404).json({ message: "文件不存在或无权操作" });

export const deleteFileController = async (
  req: AuthRequest,
  res: Response,
) => {
  const { fileId, kind = "file" } = req.body as {
    fileId?: string;
    kind?: DeleteTargetKind;
  };
  if (!fileId) {
    return res.status(400).json({ message: "对象 id 不能为空" });
  }

  const result = await deleteOwnedTargets(req.user?.id, [{ id: fileId, kind }]);
  if (!result.filesToDelete.length && !result.folderIdsToDelete.length) {
    return notFound(res);
  }
  successResponse(
    res,
    {
      deletedFileCount: result.filesToDelete.length,
      deletedFolderCount: result.folderIdsToDelete.length,
      missingFileIds: result.missingFileIds,
      missingFolderIds: result.missingFolderIds,
    },
    kind === "folder" ? "文件夹删除成功" : "文件删除成功",
  );
};

const normalizeBatchTargets = (body: {
  fileIds?: string[];
  targets?: DeleteTarget[];
}): DeleteTarget[] => {
  const targets = Array.isArray(body.targets)
    ? body.targets
      .filter(
        (item) =>
          item?.id && (item.kind === "file" || item.kind === "folder"),
      )
      .map(({ id, kind }) => ({ id, kind }))
    : [];
  const legacyFiles = Array.isArray(body.fileIds)
    ? body.fileIds
        .filter(Boolean)
        .map((id) => ({ id, kind: "file" as const }))
    : [];
  return [...targets, ...legacyFiles];
};

export const deleteFilesBatchController = async (
  req: AuthRequest,
  res: Response,
) => {
  const targets = normalizeBatchTargets(req.body);
  if (!targets.length) {
    return res.status(400).json({ message: "targets 不能为空" });
  }

  const result = await deleteOwnedTargets(req.user?.id, targets);
  if (!result.filesToDelete.length && !result.folderIdsToDelete.length) {
    return notFound(res);
  }
  const deletedIds = [
    ...result.filesToDelete.map(({ _id }) => _id),
    ...result.folderIdsToDelete,
  ];
  successResponse(
    res,
    {
      deletedCount: deletedIds.length,
      deletedFileCount: result.filesToDelete.length,
      deletedFolderCount: result.folderIdsToDelete.length,
      deletedIds,
      missingFileIds: result.missingFileIds,
      missingFolderIds: result.missingFolderIds,
    },
    result.missingFileIds.length === 0 && result.missingFolderIds.length === 0
      ? "批量删除成功"
      : "批量删除完成，部分对象不存在或无权操作",
  );
};
