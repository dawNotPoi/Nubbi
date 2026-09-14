import {
  cancelUpload,
  getUploadStatus,
  initUpload,
  mergeUpload,
  uploadChunk,
} from "@/controller/file/upload";
import { httpError } from "@/common/http-error";
import {
  fileUploadPaths,
  fileUploadPolicy,
} from "@/lib/fileUploadPolicy";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import { withAccountContext } from "@/middleware/common";
import { skipAccountMutationTracking } from "@/middleware/account-mutation";
import { requireAuthWithApiKey as requireAuth } from "@/middleware/session";
import { createJsonRouteRegistrar } from "@/routes/infrastructure/json-route-registrar";
import { successResponse } from "@/routes/utils";
import {
  chunkUploadBodySchema,
  initUploadBodySchema,
  mergeUploadBodySchema,
  uploadTaskParamsSchema,
  type ChunkUploadBody,
} from "./upload-schemas";
import express from "express";
import type { RequestHandler } from "express";
import multer from "multer";

const router = express.Router();
type FileUploadAction = "create" | "read" | "update" | "delete";
const uploadRoutes = createJsonRouteRegistrar<
  FileUploadAction,
  AuthenticatedUser
>(router, {
  authorize: () => requireAuth,
  resolveActor: requireAuthenticatedUser,
});

const chunkReceiver = multer({
  dest: fileUploadPaths.multerTemp,
  limits: {
    fileSize: fileUploadPolicy.maxChunkBytes,
    files: 1,
    fields: 4,
  },
}).single("chunk");

const receiveChunk: RequestHandler = (req, res, next): void => {
  chunkReceiver(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(
        httpError(413, "上传分片超过大小限制"),
      );
      return;
    }
    next(error);
  });
};

const parseChunkUploadBody = (value: unknown): ChunkUploadBody | null => {
  const result = chunkUploadBodySchema.safeParse(value);
  return result.success ? result.data : null;
};

uploadRoutes.post("/init", {
  action: "create",
  body: initUploadBodySchema,
  handler: ({ actor, body }) => initUpload(actor.id, body),
});

// multipart 必须先由 Multer 落盘，无法使用只处理 JSON 的类型化注册器。
router.post(
  "/uploadchunk",
  skipAccountMutationTracking,
  requireAuth,
  receiveChunk,
  withAccountContext(async (req, res) => {
    if (!req.file) {
      throw httpError(400, "缺少上传分片");
    }
    const input = parseChunkUploadBody(req.body);
    const result = await uploadChunk(
      requireAuthenticatedUser(req).id,
      input,
      req.file,
    );
    successResponse(res, result);
  }),
);

uploadRoutes.post("/merge", {
  action: "update",
  body: mergeUploadBodySchema,
  handler: ({ actor, body }) => mergeUpload(actor.id, body.uploadId),
});

uploadRoutes.get("/upload/:uploadId", {
  action: "read",
  params: uploadTaskParamsSchema,
  handler: ({ actor, params }) => getUploadStatus(actor.id, params.uploadId),
});

uploadRoutes.delete("/upload/:uploadId", {
  action: "delete",
  params: uploadTaskParamsSchema,
  handler: ({ actor, params }) => cancelUpload(actor.id, params.uploadId),
});

export default router;
