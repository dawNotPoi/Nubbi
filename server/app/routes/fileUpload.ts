import {
  cancelUpload,
  getUploadStatus,
  initUpload,
  mergeUpload,
  uploadChunk,
} from "@/controller/fileUpload";
import { requireAuthWithApiKey as requireAuth } from "@/middleware/session";
import { fileUploadConfig } from "@/services/fileUpload/config";
import { FileUploadError } from "@/services/fileUpload/errors";
import { MULTER_TEMP_DIR } from "@/services/fileUpload/storage";
import express from "express";
import fse from "fs-extra";
import multer from "multer";

const router = express.Router();
fse.ensureDirSync(MULTER_TEMP_DIR);

const chunkReceiver = multer({
  dest: MULTER_TEMP_DIR,
  limits: { fileSize: fileUploadConfig.maxChunkBytes, files: 1, fields: 4 },
}).single("chunk");

const receiveChunk: express.RequestHandler = (req, res, next) => {
  chunkReceiver(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(
        new FileUploadError(413, "CHUNK_TOO_LARGE", "上传分片超过大小限制"),
      );
    }
    return next(error);
  });
};

router.post("/init", requireAuth, initUpload);
router.post("/uploadchunk", requireAuth, receiveChunk, uploadChunk);
router.post("/merge", requireAuth, mergeUpload);
router.get("/upload/:uploadId", requireAuth, getUploadStatus);
router.delete("/upload/:uploadId", requireAuth, cancelUpload);

export default router;
