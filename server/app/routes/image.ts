import env from "@/lib/env";
import image from "@/models/image";
import express from "express";
import multer from "multer";
import { asyncHandler } from "../middleware/common";
import { successResponse } from "./utils";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const getSafeFileName = (name: string) => {
  return name
    .replace(/[\\/:*?"<>|#%{}[\]^~`]/g, "_")
    .replace(/\s+/g, "_");
};

const uploadImageToGitHub = async (file: Express.Multer.File) => {
  if (!env.GH_IMAGE_REPO || !env.GH_IMAGE_TOKEN) {
    throw Object.assign(new Error("GitHub 图床服务未配置"), { status: 500 });
  }

  const safeName = getSafeFileName(file.originalname || "image");
  const filePath = `img/${Date.now()}_${safeName}`;
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${env.GH_IMAGE_REPO}/contents/${encodedPath}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.GH_IMAGE_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Upload image ${safeName}`,
      content: file.buffer.toString("base64"),
      branch: env.GH_IMAGE_BRANCH || "main",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("GitHub 图床上传失败", {
      status: response.status,
      statusText: response.statusText,
      body: text,
    });
    throw Object.assign(new Error("GitHub 图床上传失败"), {
      status: response.status,
    });
  }

  const data = await response.json();

  return {
    url: data.content?.download_url,
    path: filePath,
    sha: data.content?.sha,
  };
};

router.post(
  "/create",
  asyncHandler(async (req, res) => {
    const { name, content, ...rest } = req.body;
    const result = await image.create({ name, content, ...rest });
    successResponse(res, result);
  }),
);

router.get(
  "/get",
  asyncHandler(async (req, res) => {
    const id = typeof req.query.id === "string" ? req.query.id : undefined;
    const result = id ? await image.findById(id) : null;
    successResponse(res, result);
  }),
);

router.delete(
  "/delete",
  asyncHandler(async (req, res) => {
    const id = typeof req.query.id === "string" ? req.query.id : undefined;
    const result = id ? await image.findByIdAndDelete(id) : null;
    successResponse(res, result);
  }),
);

router.post(
  "/github",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ code: 0, message: "请选择图片文件" });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ code: 0, message: "只支持上传图片" });
    }

    const result = await uploadImageToGitHub(req.file);
    successResponse(res, result);
  }),
);

export default router;
