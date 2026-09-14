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

export type FileLinkResult = {
  url: string;
  expiresAt: number;
};

const requireOwnedFileResource = async (fileId: string, userId: string) => {
  const file = await getOwnedActiveFile(fileId, userId);
  if (!file) throw httpError(404, "File not found or access denied");
  if (!(await fileResourceExists(file.storagePath))) {
    throw httpError(404, "File resource not found");
  }
  return file;
};

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
