import type { AuthRequest } from "@/middleware/common";
import {
  cachePreview,
  deleteCachedPreview,
  fileResourceExists,
  getCachedPreview,
  getOwnedActiveFile,
  normalizeRouteParam,
} from "@/services/fileAccess/resource";
import {
  normalizeQueryValue,
  resolveSignedPreviewUserId,
  resolveSignedShareDownloadUserId,
} from "@/services/fileAccess/signatures";
import { streamFileResponse } from "@/services/fileAccess/stream";
import type { Response } from "express";

export const signedStreamPreviewController = async (
  req: AuthRequest,
  res: Response,
): Promise<Response | void> => {
  const fileId = normalizeRouteParam(req.params.fileId);
  if (!fileId) {
    return res.status(400).json({ message: "文件 id 不能为空" });
  }
  const userId = resolveSignedPreviewUserId(
    fileId,
    req.query as Record<string, unknown>,
  );
  if (!userId) {
    return res.status(403).json({ message: "预览链接无效或已过期" });
  }

  const token = normalizeQueryValue(req.query.token);
  const expiresAt = Number(normalizeQueryValue(req.query.expires));
  const cachedFile = token ? getCachedPreview(token) : undefined;
  if (
    cachedFile &&
    cachedFile.fileId === fileId &&
    cachedFile.userId === userId &&
    cachedFile.expiresAt >= Date.now()
  ) {
    await streamFileResponse(res, cachedFile, req.headers.range);
    return;
  }
  if (cachedFile) deleteCachedPreview(token);

  const file = await getOwnedActiveFile(fileId, userId);
  if (!file) {
    return res.status(404).json({ message: "文件不存在或无权访问" });
  }
  if (!(await fileResourceExists(file.storagePath))) {
    return res.status(404).json({ message: "文件资源不存在" });
  }
  if (token && Number.isFinite(expiresAt)) {
    cachePreview(token, {
      fileId,
      userId,
      expiresAt,
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      extension: file.extension,
      name: file.name,
    });
  }
  await streamFileResponse(res, file, req.headers.range);
};

export const publicDownloadController = async (
  req: AuthRequest,
  res: Response,
): Promise<Response | void> => {
  const fileId = normalizeRouteParam(req.params.fileId);
  if (!fileId) {
    return res.status(400).json({ message: "文件 id 不能为空" });
  }
  const userId = resolveSignedShareDownloadUserId(
    fileId,
    req.query as Record<string, unknown>,
  );
  if (!userId) {
    return res.status(403).json({ message: "分享链接无效或已过期" });
  }
  const file = await getOwnedActiveFile(fileId, userId);
  if (!file) {
    return res.status(404).json({ message: "文件不存在或分享已失效" });
  }
  if (!(await fileResourceExists(file.storagePath))) {
    return res.status(404).json({ message: "文件资源不存在" });
  }
  return res.download(file.storagePath, file.name);
};

export const downloadFileController = async (
  req: AuthRequest,
  res: Response,
): Promise<Response | void> => {
  const fileId = normalizeRouteParam(req.params.fileId);
  if (!fileId) {
    return res.status(400).json({ message: "文件 id 不能为空" });
  }
  const file = await getOwnedActiveFile(fileId, req.user?.id);
  if (!file) {
    return res.status(404).json({ message: "文件不存在或无权访问" });
  }
  if (!(await fileResourceExists(file.storagePath))) {
    return res.status(404).json({ message: "文件资源不存在" });
  }
  return res.download(file.storagePath, file.name);
};

export const previewFileController = async (
  req: AuthRequest,
  res: Response,
): Promise<Response | void> => {
  const fileId = normalizeRouteParam(req.params.fileId);
  if (!fileId) {
    return res.status(400).json({ message: "文件 id 不能为空" });
  }
  const file = await getOwnedActiveFile(fileId, req.user?.id);
  if (!file) {
    return res.status(404).json({ message: "文件不存在或无权访问" });
  }
  if (!(await fileResourceExists(file.storagePath))) {
    return res.status(404).json({ message: "文件资源不存在" });
  }
  await streamFileResponse(res, file, req.headers.range);
};
