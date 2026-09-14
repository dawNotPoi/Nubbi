import { httpError } from "@/common/http-error";
import {
  createImage,
  deleteImage,
  findImage,
  uploadOwnedImageToGitHub,
} from "@/controller/image";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import env from "@/lib/env";
import { withAccountContext } from "@/middleware/common";
import { skipAccountMutationTracking } from "@/middleware/account-mutation";
import { requireAuthWithApiKey } from "@/middleware/session";
import { createJsonRouteRegistrar } from "@/routes/infrastructure/json-route-registrar";
import { successResponse } from "@/routes/utils";
import {
  createImageBodySchema,
  imageIdQuerySchema,
} from "@/routes/image/schemas";
import express from "express";
import type { RequestHandler } from "express";
import multer from "multer";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const router = express.Router();
type ImageAction = "create" | "read" | "delete";
const imageRoutes = createJsonRouteRegistrar<
  ImageAction,
  AuthenticatedUser
>(router, {
  authorize: () => requireAuthWithApiKey,
  resolveActor: requireAuthenticatedUser,
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.IMAGE_UPLOAD_MAX_BYTES,
    files: 1,
  },
});

const receiveImageUpload: RequestHandler = (req, res, next): void => {
  upload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      next(
        httpError(
          tooLarge ? 413 : 400,
          tooLarge ? "图片大小超过上传限制" : "图片上传格式错误",
        ),
      );
      return;
    }

    next(error);
  });
};

imageRoutes.post("/create", {
  action: "create",
  body: createImageBodySchema,
  handler: ({ actor, body }) =>
    createImage({
      ...body,
      ownerId: actor.id,
    }),
});

imageRoutes.get("/get", {
  action: "read",
  query: imageIdQuerySchema,
  handler: ({ actor, query }) => findImage(query.id, actor.id),
});

imageRoutes.delete("/delete", {
  action: "delete",
  query: imageIdQuerySchema,
  handler: ({ actor, query }) => deleteImage(query.id, actor.id),
});

// multipart 文件需由 Multer 先解析，不能交给 JSON 路由注册器。
router.post(
  "/github",
  skipAccountMutationTracking,
  requireAuthWithApiKey,
  receiveImageUpload,
  withAccountContext(async (req, res) => {
    if (!req.file) {
      throw httpError(400, "请选择图片文件");
    }
    if (!ALLOWED_IMAGE_TYPES.has(req.file.mimetype)) {
      throw httpError(400, "不支持该图片格式");
    }
    successResponse(
      res,
      await uploadOwnedImageToGitHub(
        requireAuthenticatedUser(req).id,
        req.file,
      ),
    );
  }),
);

export default router;
