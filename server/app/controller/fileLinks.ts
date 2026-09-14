import { httpError } from "@/common/http-error";
import {
  cachePreview,
  fileResourceExists,
  getOwnedActiveFile,
  prunePreviewCache,
} from "@/services/fileAccess/resource";
import {
  buildPreviewStreamPath,
  buildPublicDownloadPath,
  createPreviewSignature,
  FILE_SHARE_TTL_MS,
  PREVIEW_STREAM_TTL_MS,
} from "@/services/fileAccess/signatures";

/** 生成的链接结果类型 */
export type FileLinkResult = {
  url: string;
  expiresAt: number;
};

/** 校验文件归属且资源存在，返回文件记录 */
const requireOwnedFileResource = async (fileId: string, userId: string) => {
  const file = await getOwnedActiveFile(fileId, userId);
  if (!file) throw httpError(404, "File not found or access denied");
  if (!(await fileResourceExists(file.storagePath))) {
    throw httpError(404, "File resource not found");
  }
  return file;
};

/** 创建带签名的预览流链接，并写入内存缓存（含预清理） */
export const createPreviewUrl = async (
  fileId: string,
  userId: string,
): Promise<FileLinkResult> => {
  const file = await requireOwnedFileResource(fileId, userId);
  const expiresAt = Date.now() + PREVIEW_STREAM_TTL_MS;
  const token = createPreviewSignature(fileId, userId, expiresAt);
  const url = buildPreviewStreamPath(fileId, userId, expiresAt);

  prunePreviewCache();
  cachePreview(token, {
    fileId,
    userId,
    expiresAt,
    storagePath: file.storagePath,
    mimeType: file.mimeType,
    extension: file.extension,
    name: file.name,
  });

  return { url, expiresAt };
};

/** 创建公开分享下载链接（带签名和过期时间） */
export const createShareUrl = async (
  fileId: string,
  userId: string,
): Promise<FileLinkResult> => {
  await requireOwnedFileResource(fileId, userId);
  const expiresAt = Date.now() + FILE_SHARE_TTL_MS;
  return {
    url: buildPublicDownloadPath(fileId, userId, expiresAt),
    expiresAt,
  };
};
