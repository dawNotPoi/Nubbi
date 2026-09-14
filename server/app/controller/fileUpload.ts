import { asyncHandler, type AuthRequest } from "@/middleware/common";
import {
  completeUpload,
  storeUploadChunk,
} from "@/services/fileUpload/chunkTask";
import { FileUploadError } from "@/services/fileUpload/errors";
import { initializeUpload } from "@/services/fileUpload/initTask";
import { prepareFileUploadInfrastructure } from "@/services/fileUpload/maintenance";
import {
  cancelUploadTask,
  getUploadTaskStatus,
} from "@/services/fileUpload/taskLifecycle";
import { chunkInputSchema, initUploadSchema, uploadIdSchema } from "@/services/fileUpload/schemas";
import fse from "fs-extra";
import { successResponse } from "@/routes/utils";

const getOwnerId = (req: AuthRequest) => {
  if (!req.user?.id) {
    throw new FileUploadError(401, "AUTH_REQUIRED", "请先登录");
  }
  return req.user.id;
};

const parseOrThrow = <T>(result: { success: boolean; data?: T }) => {
  if (!result.success || !result.data) {
    throw new FileUploadError(400, "UPLOAD_INPUT_INVALID", "上传参数不正确");
  }
  return result.data;
};

export const initUpload = asyncHandler(async (req, res) => {
  await prepareFileUploadInfrastructure();
  const input = parseOrThrow(initUploadSchema.safeParse(req.body));
  successResponse(res, await initializeUpload(getOwnerId(req), input));
});

export const uploadChunk = asyncHandler(async (req, res) => {
  const incomingFile = req.file;
  if (!incomingFile) {
    throw new FileUploadError(400, "CHUNK_REQUIRED", "缺少上传分片");
  }
  try {
    const input = parseOrThrow(chunkInputSchema.safeParse(req.body));
    const result = await storeUploadChunk({
      ownerId: getOwnerId(req),
      uploadId: input.uploadId,
      chunkIndex: input.chunkIndex,
      incomingFile,
    });
    successResponse(res, result);
  } catch (error) {
    await fse.remove(incomingFile.path);
    throw error;
  }
});

export const mergeUpload = asyncHandler(async (req, res) => {
  const result = uploadIdSchema.safeParse(req.body?.uploadId);
  const uploadId = parseOrThrow(result);
  successResponse(res, await completeUpload(getOwnerId(req), uploadId));
});

export const getUploadStatus = asyncHandler(async (req, res) => {
  const result = uploadIdSchema.safeParse(req.params.uploadId);
  const uploadId = parseOrThrow(result);
  successResponse(res, await getUploadTaskStatus(getOwnerId(req), uploadId));
});

export const cancelUpload = asyncHandler(async (req, res) => {
  const result = uploadIdSchema.safeParse(req.params.uploadId);
  const uploadId = parseOrThrow(result);
  successResponse(res, await cancelUploadTask(getOwnerId(req), uploadId));
});
