import {
  listFilesController,
  moveFileBatchController,
  moveFileController,
} from "@/controller/fileManagement";
import {
  deleteFileController,
  deleteFilesBatchController,
} from "@/controller/fileDeletion";
import {
  createFolderLegacyController,
  getFoldersLegacyController,
  listFilesLegacyController,
  renameItemLegacyController,
} from "@/controller/fileLegacy";
import { asyncHandler } from "@/middleware/common";
import { requireAuthWithApiKey as requireAuth } from "@/middleware/session";
import { validate, validateQuery } from "@/middleware/validator";
import {
  createFolderSchema,
  deleteBatchSchema,
  deleteFileSchema,
  fileListQuerySchema,
  legacyListSchema,
  moveBatchSchema,
  moveFileSchema,
  renameFileSchema,
} from "@/services/fileManagement/schemas";
import express from "express";

const router = express.Router();

router.get(
  "/list",
  requireAuth,
  validateQuery(fileListQuerySchema),
  asyncHandler(listFilesController),
);
router.post(
  "/move",
  requireAuth,
  validate(moveFileSchema),
  asyncHandler(moveFileController),
);
router.post(
  "/move-batch",
  requireAuth,
  validate(moveBatchSchema),
  asyncHandler(moveFileBatchController),
);
router.post(
  "/delete",
  requireAuth,
  validate(deleteFileSchema),
  asyncHandler(deleteFileController),
);
router.post(
  "/delete-batch",
  requireAuth,
  validate(deleteBatchSchema),
  asyncHandler(deleteFilesBatchController),
);
router.post(
  "/list",
  requireAuth,
  validate(legacyListSchema),
  asyncHandler(listFilesLegacyController),
);
router.post(
  "/createfolder",
  requireAuth,
  validate(createFolderSchema),
  asyncHandler(createFolderLegacyController),
);
router.get("/folders", requireAuth, asyncHandler(getFoldersLegacyController));
router.post(
  "/rename",
  requireAuth,
  validate(renameFileSchema),
  asyncHandler(renameItemLegacyController),
);

export default router;
