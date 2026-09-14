import { File } from "@/models/file/file";
import fse from "fs-extra";
import path from "path";
import { getUploadOwnerDirectory } from "./storage";

/** 引用计数、物理删除、目录读取的依赖注入类型 */
type CountReferences = (storagePath: string) => Promise<number>;
type RemoveStorage = (storagePath: string) => Promise<void>;
type ReadDirectory = (directory: string) => Promise<string[]>;

/** 查询文件引用数（默认按 storagePath 统计 File 记录） */
const countReferences: CountReferences = (storagePath) =>
  File.countDocuments({ storagePath });
/** 删除物理文件 */
const removeStorage: RemoveStorage = async (storagePath) => {
  await fse.remove(storagePath);
};
/** 读取目录列表 */
const readDirectory: ReadDirectory = (directory) => fse.readdir(directory);
/** 判断是否为目录不存在错误 */
const isMissingPath = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ENOENT";

/** 删除无引用的物理文件（引用计数 > 0 时跳过） */
export const removeUnreferencedUploadFile = async (
  storagePath: string,
  count: CountReferences = countReferences,
  remove: RemoveStorage = removeStorage,
): Promise<boolean> => {
  if ((await count(storagePath)) > 0) return false;
  await remove(storagePath);
  return true;
};

/** 清理上传任务的暂存文件（隐藏 .part 文件） */
export const removeUploadStagingFiles = async (
  ownerId: string,
  uploadId: string,
  read: ReadDirectory = readDirectory,
  remove: RemoveStorage = removeStorage,
): Promise<void> => {
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
