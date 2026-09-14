import { File } from "@/models/file/file";
import fse from "fs-extra";

export type FileResource = {
  fileId: string;
  userId: string;
  expiresAt: number;
  storagePath: string;
  mimeType?: string | null;
  extension?: string | null;
  name: string;
};

const previewStreamCache = new Map<string, FileResource>();

export const normalizeRouteParam = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

export const getOwnedActiveFile = async (
  fileId: string,
  userId?: string,
) => {
  if (!userId) return null;
  return File.findOne({ _id: fileId, ownerId: userId, status: "active" });
};

export const fileResourceExists = (storagePath: string) =>
  fse.pathExists(storagePath);

export const getCachedPreview = (token: string): FileResource | undefined =>
  previewStreamCache.get(token);

export const cachePreview = (token: string, file: FileResource): void => {
  previewStreamCache.set(token, file);
};

export const deleteCachedPreview = (token: string): void => {
  previewStreamCache.delete(token);
};

export const prunePreviewCache = (now = Date.now()): void => {
  for (const [token, file] of previewStreamCache.entries()) {
    if (file.expiresAt < now) previewStreamCache.delete(token);
  }
};
