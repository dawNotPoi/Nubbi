import type { AuthRequest } from "@/middleware/common";
import { successResponse } from "@/routes/utils";
import {
  cachePreview,
  fileResourceExists,
  getOwnedActiveFile,
  normalizeRouteParam,
  prunePreviewCache,
} from "@/services/fileAccess/resource";
import {
  buildPreviewStreamPath,
  buildPublicDownloadPath,
  createPreviewSignature,
  FILE_SHARE_TTL_MS,
  PREVIEW_STREAM_TTL_MS,
} from "@/services/fileAccess/signatures";
import type { Response } from "express";

export const createPreviewUrlController = async (
  req: AuthRequest,
  res: Response,
) => {
  const fileId = normalizeRouteParam(req.params.fileId);
  const userId = req.user?.id;
  if (!fileId) {
    return res.status(400).json({ message: "文件 id 不能为空" });
  }
  const file = await getOwnedActiveFile(fileId, userId);
  if (!file) {
    return res.status(404).json({ message: "文件不存在或无权访问" });
  }
  if (!(await fileResourceExists(file.storagePath))) {
    return res.status(404).json({ message: "文件资源不存在" });
  }

  const expiresAt = Date.now() + PREVIEW_STREAM_TTL_MS;
  const token = createPreviewSignature(fileId, userId!, expiresAt);
  const url = buildPreviewStreamPath(fileId, userId!, expiresAt);
  prunePreviewCache();
  cachePreview(token, {
    fileId,
    userId: userId!,
    expiresAt,
    storagePath: file.storagePath,
    mimeType: file.mimeType,
    extension: file.extension,
    name: file.name,
  });
  successResponse(res, { url, expiresAt });
};

export const createShareUrlController = async (
  req: AuthRequest,
  res: Response,
) => {
  const fileId = normalizeRouteParam(req.params.fileId);
  const userId = req.user?.id;
  if (!fileId) {
    return res.status(400).json({ message: "文件 id 不能为空" });
  }
  const file = await getOwnedActiveFile(fileId, userId);
  if (!file) {
    return res.status(404).json({ message: "文件不存在或无权访问" });
  }
  if (!(await fileResourceExists(file.storagePath))) {
    return res.status(404).json({ message: "文件资源不存在" });
  }
  const expiresAt = Date.now() + FILE_SHARE_TTL_MS;
  const url = buildPublicDownloadPath(fileId, userId!, expiresAt);
  successResponse(res, { url, expiresAt });
};
