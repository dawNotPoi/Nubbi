import { asyncHandler } from "./../middleware/common";

import log from "@/common/chalk";
import { getUser } from "@/lib/auth";
import requireAuth from "@/middleware/session";
import File from "@/models/file";
import express from "express";
import fse from "fs-extra";
import multer from "multer";
import path from "path";
import { successResponse } from "./utils";

const router = express.Router();
// file upload
const uploadPath = "./source";
const finalDir = "./static";
const downloadPath = "http://localhost:4000/file";
if (!fse.pathExistsSync(uploadPath)) {
  fse.mkdirSync(uploadPath);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
});
const upload = multer({ storage });
const tempDir = "temp";
if (!fse.pathExistsSync(tempDir)) {
  fse.mkdirSync(tempDir);
}

const validateFile = async (user, fileId) => {
  const file = await File.findById(fileId);
  if (!file) {
    throw Object.assign(new Error("文件不存在"), { status: 404 });
  }
  if (file.userId !== user.id) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
};

router.post(
  "/upload",
  upload.single("file"),
  asyncHandler((req, res) => {
    const { hash, index } = req.body;
    //临时文件夹，存储当前文件的所有分片
    let tempFileDir = path.resolve(tempDir, hash);
    // 如果当前文件的临时文件夹不存在，则创建该文件夹
    if (!fse.pathExistsSync(tempFileDir)) {
      fse.mkdirSync(tempFileDir);
    }
    //存储分片的文件夹
    const tempChunkDir = path.resolve(tempFileDir, index);
    // （multer默认保存的分片位置）
    let multerChunkPath = path.resolve(req.file!.path);
    log.info(multerChunkPath);
    if (!fse.existsSync(tempChunkDir)) {
      fse.moveSync(multerChunkPath, tempChunkDir);
    } else {
      fse.removeSync(multerChunkPath);
    }
    successResponse(res, true);
  })
);

router.delete(
  "/delete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { _id } = req.body;
    const user = await getUser(req);
    await validateFile(user, _id);
    const result = await File.findByIdAndDelete({ _id });
    successResponse(res, result);
  })
);

router.get(
  "/checkFile",
  asyncHandler(async (req, res) => {
    const { hash, name } = req.query as { hash: string; name: string };
    const result = await File.findOne({ hash: hash });
    if (result) {
      await File.create({
        hash,
        name,
        path: result?.path,
        type: name.split(".").pop(),
      });
      successResponse(res, { needUpload: false });
    } else {
      successResponse(res, { needUpload: true });
    }
  })
);

router.get(
  "/checkChunks",
  asyncHandler(async (req, res) => {
    const { hash } = req.query;
    const result = await File.findOne({ hash });
    if (result) {
      const tempFileDir = path.resolve(tempDir, hash);
      const uploadedChunk = fse.readdirSync(tempFileDir);
      log.info(uploadedChunk); //打印上传过的切片
      successResponse(res, uploadedChunk);
    } else {
      successResponse(res, false);
    }
  })
);

router.get("/merge", requireAuth, async (req, res) => {
  const { hash, name } = req.query as { hash: string; name: string };
  // 最终合并的文件路径
  const filePath = path.resolve(finalDir, hash);
  // 临时文件夹路径
  let tempFileDir = path.resolve(tempDir, hash);
  // 读取临时文件夹，获取所有切片
  const chunkPaths = fse.readdirSync(tempFileDir);
  log.info(chunkPaths);
  let mergeTasks: Promise<void>[] = [];
  for (let index = 0; index < chunkPaths.length; index++) {
    mergeTasks.push(
      new Promise((resolve) => {
        // 当前遍历的切片路径
        const chunkPath = path.resolve(tempFileDir, index + "");
        // 将当前遍历的切片切片追加到文件中
        fse.appendFileSync(filePath, fse.readFileSync(chunkPath));
        // 删除当前遍历的切片
        resolve();
      })
    );
  }
  await Promise.all(mergeTasks);
  // 等待所有切片追加到文件后，删除临时文件夹
  fse.removeSync(tempFileDir);
  const extname = path.extname(name);
  const user = await getUser(req);
  try {
    await File.create({
      userId: user.id,
      hash,
      name,
      type: extname,
    });
  } catch (error) {
    console.error(error);
  }
  res.send({
    msg: "合并成功",
    success: true,
  });
});

router.get(
  "/getFiles",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const result = await File.find({ userId: user.id });
    successResponse(res, result);
  })
);

router.post(
  "/rename",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const { _id, name } = req.body;
      const result = await File.updateOne({ _id }, { name });
      log.info(result);
      successResponse(res, result);
    } catch (error) {
      log.error(error);
    }
  })
);

router.get(
  "/:Id",
  asyncHandler(async (req, res) => {
    const { Id } = req.params;
    const result = await File.findById(Id);

    if (!result) throw new Error("文件失效");
    const filePath = path.resolve(finalDir, result.hash);
    log.info(filePath);
    if (fse.existsSync(filePath)) {
      res.download(filePath, result.name);
    } else {
      await File.deleteOne({ _id: Id });
      throw new Error("文件失效");
    }
  })
);

export default router;
