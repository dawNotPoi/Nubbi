import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import { fileUploadConfig } from "@/services/fileUpload/config";
import { getStorageUsage } from "@/services/fileUpload/reservation";

/** 文件页展示用的存储用量统计 */
export type FileStats = {
  usedBytes: number;
  reservedBytes: number;
  quotaBytes: number;
  fileCount: number;
  folderCount: number;
};

/**
 * 汇总当前用户的存储用量、配额和条目数量，供文件页用量条展示。
 * 用量口径与上传配额校验一致，避免展示值与实际可用空间不一致。
 * @param ownerId 用户 ID。
 * @returns 存储用量统计。
 */
export const getFileStats = async (ownerId: string): Promise<FileStats> => {
  const [{ usedBytes, reservedBytes }, fileCount, folderCount] =
    await Promise.all([
      getStorageUsage(ownerId),
      File.countDocuments({ ownerId, status: "active" }),
      Folder.countDocuments({ ownerId }),
    ]);

  return {
    usedBytes,
    reservedBytes,
    quotaBytes: fileUploadConfig.userQuotaBytes,
    fileCount,
    folderCount,
  };
};
