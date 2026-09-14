import { File } from "@/models/file/file";
import fse from "fs-extra";
import path from "path";
import { getUploadOwnerDirectory } from "./storage";

type CountReferences = (storagePath: string) => Promise<number>;
type RemoveStorage = (storagePath: string) => Promise<void>;
type ReadDirectory = (directory: string) => Promise<string[]>;

const countReferences: CountReferences = (storagePath) =>
  File.countDocuments({ storagePath });
const removeStorage: RemoveStorage = async (storagePath) => {
  await fse.remove(storagePath);
};
const readDirectory: ReadDirectory = (directory) => fse.readdir(directory);
const isMissingPath = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ENOENT";

export const removeUnreferencedUploadFile = async (
  storagePath: string,
  count: CountReferences = countReferences,
  remove: RemoveStorage = removeStorage,
): Promise<boolean> => {
  if ((await count(storagePath)) > 0) return false;
  await remove(storagePath);
  return true;
};

export const removeUploadStagingFiles = async (
  ownerId: string,
  uploadId: string,
  read: ReadDirectory = readDirectory,
  remove: RemoveStorage = removeStorage,
) => {
  const directory = getUploadOwnerDirectory(ownerId);
  let entries: string[];
  try {
    entries = await read(directory);
  } catch (error) {
    if (isMissingPath(error)) return;
    throw error;
  }
  const legacyName = `.${uploadId}.part`;
  const tokenPrefix = `.${uploadId}-`;
  await Promise.all(entries
    .filter((entry) =>
      entry === legacyName ||
      (entry.startsWith(tokenPrefix) && entry.endsWith(".part")),
    )
    .map((entry) => remove(path.join(directory, entry))));
};
