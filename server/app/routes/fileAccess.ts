import {
  downloadFileController,
  previewFileController,
  publicDownloadController,
  signedStreamPreviewController,
} from "@/controller/fileDelivery";
import {
  createPreviewUrlController,
  createShareUrlController,
} from "@/controller/fileLinks";
import { asyncHandler } from "@/middleware/common";
import { requireAuthWithApiKey as requireAuth } from "@/middleware/session";
import { validateParams } from "@/middleware/validator";
import { fileIdParamsSchema } from "@/services/fileManagement/schemas";
import express from "express";

const router = express.Router();

router.get(
  "/preview-url/:fileId",
  requireAuth,
  validateParams(fileIdParamsSchema),
  asyncHandler(createPreviewUrlController),
);
router.get(
  "/share-url/:fileId",
  requireAuth,
  validateParams(fileIdParamsSchema),
  asyncHandler(createShareUrlController),
);
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
