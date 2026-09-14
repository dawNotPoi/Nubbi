import {
  downloadFileController,
  previewFileController,
  publicDownloadController,
  signedStreamPreviewController,
} from "@/controller/fileDelivery";
import { createPreviewUrl, createShareUrl } from "@/controller/fileLinks";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import { asyncHandler } from "@/middleware/common";
import { requireAuthWithApiKey as requireAuth } from "@/middleware/session";
import { validateParams } from "@/middleware/validator";
import { createJsonRouteRegistrar } from "@/routes/infrastructure/json-route-registrar";
import { fileIdParamsSchema } from "./schemas";
import express from "express";

const router = express.Router();
const fileAccessRoutes = createJsonRouteRegistrar<"read", AuthenticatedUser>(
  router,
  {
    authorize: () => requireAuth,
    resolveActor: requireAuthenticatedUser,
  },
);

fileAccessRoutes.get("/preview-url/:fileId", {
  action: "read",
  params: fileIdParamsSchema,
  handler: ({ actor, params }) => createPreviewUrl(params.fileId, actor.id),
});

fileAccessRoutes.get("/share-url/:fileId", {
  action: "read",
  params: fileIdParamsSchema,
  handler: ({ actor, params }) => createShareUrl(params.fileId, actor.id),
});
router.head(
  "/stream/:fileId",
  validateParams(fileIdParamsSchema),
  asyncHandler(signedStreamPreviewController),
);
router.get(
  "/stream/:fileId",
  validateParams(fileIdParamsSchema),
  asyncHandler(signedStreamPreviewController),
);
router.get(
  "/public-download/:fileId",
  validateParams(fileIdParamsSchema),
  asyncHandler(publicDownloadController),
);
router.get(
  "/download/:fileId",
  requireAuth,
  validateParams(fileIdParamsSchema),
  asyncHandler(downloadFileController),
);
router.get(
  "/preview/:fileId",
  requireAuth,
  validateParams(fileIdParamsSchema),
  asyncHandler(previewFileController),
);

export default router;
