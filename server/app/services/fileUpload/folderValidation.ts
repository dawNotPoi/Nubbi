import { Folder } from "@/models/file/folder";
import { FileUploadError } from "./errors";

type FolderExists = (
  ownerId: string,
  folderId: string,
) => Promise<boolean>;

const folderExists: FolderExists = async (ownerId, folderId) =>
  Boolean(await Folder.exists({ _id: folderId, ownerId }));

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
