import logger from "@/common/logger";
import {
  completeUpload,
  storeUploadChunk,
} from "@/services/fileUpload/chunkTask";
import { initializeUpload } from "@/services/fileUpload/initTask";
import { prepareFileUploadInfrastructure } from "@/services/fileUpload/maintenance";
import {
  cancelUploadTask,
  getUploadTaskStatus,
} from "@/services/fileUpload/taskLifecycle";
import { FileUploadError } from "@/services/fileUpload/errors";
import { runAccountMutation } from "@/services/auth/account-mutation-guard";
import type {
  InitUploadInput,
  UploadChunkInput,
} from "@/services/fileUpload/types";
import fse from "fs-extra";

/** 初始化上传：确保基础设施就绪后创建/恢复上传任务 */
export const initUpload = async (
  ownerId: string,
  input: InitUploadInput,
): Promise<Awaited<ReturnType<typeof initializeUpload>>> => {
  await prepareFileUploadInfrastructure();
  return initializeUpload(ownerId, input);
};

/** 上传分片：在账号变更锁保护下存储分片，失败时清理临时文件 */
export const uploadChunk = async (
  ownerId: string,
  input: UploadChunkInput | null,
  incomingFile: Express.Multer.File,
): Promise<Awaited<ReturnType<typeof storeUploadChunk>>> => {
  try {
    return await runAccountMutation(ownerId, async () => {
      if (!input) {
        throw new FileUploadError(
          400,
          "UPLOAD_INPUT_INVALID",
          "上传参数不正确",
        );
      }
      return storeUploadChunk({
        ownerId,
        uploadId: input.uploadId,
        chunkIndex: input.chunkIndex,
        incomingFile,
      });
    });
  } catch (error) {
    await fse.remove(incomingFile.path).catch((cleanupError: unknown) => {
      logger.warn("上传分片失败后的临时文件清理失败", {
        path: incomingFile.path,
        error: cleanupError,
      });
    });
    throw error;
  }
};

/** 合并上传分片并完成文件落库 */
export const mergeUpload = (
  ownerId: string,
  uploadId: string,
): ReturnType<typeof completeUpload> => completeUpload(ownerId, uploadId);

/** 查询上传任务状态 */
export const getUploadStatus = (
  ownerId: string,
  uploadId: string,
): ReturnType<typeof getUploadTaskStatus> =>
  getUploadTaskStatus(ownerId, uploadId);

/** 取消上传任务 */
export const cancelUpload = (
  ownerId: string,
  uploadId: string,
): ReturnType<typeof cancelUploadTask> => cancelUploadTask(ownerId, uploadId);
