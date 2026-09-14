import { Folder } from "@/models/file/folder";
import { FileUploadError } from "./errors";

/** 文件夹存在性检查的类型 */
type FolderExists = (
  ownerId: string,
  folderId: string,
) => Promise<boolean>;

/** 检查文件夹是否存在且属于当前用户 */
const folderExists: FolderExists = async (ownerId, folderId) =>
  Boolean(await Folder.exists({ _id: folderId, ownerId }));

/** 断言上传目标文件夹存在且可访问（final 阶段缺失视为目标失效） */
export const assertOwnedUploadFolder = async (
  ownerId: string,
  folderId: unknown,
  stage: "init" | "final" = "init",
  exists: FolderExists = folderExists,
): Promise<void> => {
  if (!folderId) return;
  if (await exists(ownerId, String(folderId))) return;
  if (stage === "final") {
    throw new FileUploadError(
      409,
      "UPLOAD_TARGET_MISSING",
      "目标文件夹已不存在，请重新选择上传位置",
    );
  }
  throw new FileUploadError(403, "FOLDER_FORBIDDEN", "无权访问该文件夹");
};
