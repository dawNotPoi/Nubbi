import requireAuth from "@/middleware/session";

import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import { UploadTask } from "@/models/file/uploadTask";
import express from "express";
import fse from "fs-extra";
import multer from "multer";
import path from "path";
import { pipeline } from "stream/promises";
import { asyncHandler, AuthRequest } from "./../middleware/common";
import { successResponse } from "./utils";
const router = express.Router();
// 基础存储路径配置
// 配置 Multer 临时缓存区（分片到达服务器后的首站）
const upload = multer({ dest: "storage/temp_multer/" });
const UPLOAD_TEMP_DIR = path.join(process.cwd(), "storage/temp"); // 临时分片目录
const UPLOAD_FINAL_DIR = path.join(process.cwd(), "storage/uploads"); // 最终文件目录
// 确保目录存在
if (!fse.existsSync(UPLOAD_TEMP_DIR))
  fse.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
if (!fse.existsSync(UPLOAD_FINAL_DIR))
  fse.mkdirSync(UPLOAD_FINAL_DIR, { recursive: true });

/**
 * -------------------------------------------------------
 * 1. 初始化上传 (Init Upload)
 * 鉴权
 * 逻辑：秒传校验 -> 断点续传校验 -> 创建新任务
 * -------------------------------------------------------
 */

router.post(
  "/init",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    try {
      const { fileName, fileHash, totalSize, totalChunksSize, folderId } =
        req.body;
      console.log(req.body);

      const userId = req.user?.id; // Better Auth 注入的用户 ID
      // A. 权限校验：如果指定了 folderId，确保该文件夹属于用户
      if (folderId) {
        const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
        if (!folder)
          return res.status(403).json({ message: "无权访问该文件夹" });
      }
      // B. 全局秒传 (Instant Upload)
      // 只要库里有 hash 且状态正常，直接“盗链”其物理路径
      const globalFile = await File.findOne({
        hash: fileHash,
        status: "active",
      });
      // 检查物理文件是否真的还存在（防御性编程）
      if (globalFile) {
        if (fse.existsSync(globalFile.storagePath)) {
          const newFile = await File.create({
            name: fileName,
            extension: path.extname(fileName),
            mimeType: globalFile.mimeType || "application/octet-stream",
            size: totalSize,
            hash: fileHash,
            folderId: folderId || null,
            ownerId: userId,
            storagePath: globalFile.storagePath, // 核心：引用现有的路径
            status: "active",
          });
          successResponse(res, { needUpload: false }, "restored");
        }
      }

      // C. 断点续传 (Resumable Upload)
      // 检查当前用户是否有未完成的任务
      let task = await UploadTask.findOne({ fileHash, ownerId: userId });
      if (!task) {
        // D. 创建新任务
        const taskTempDir = path.join(UPLOAD_TEMP_DIR, fileHash);
        if (!fse.existsSync(taskTempDir)) fse.mkdirSync(taskTempDir);
        task = await UploadTask.create({
          fileHash,
          fileName,
          folderId: folderId || null,
          totalSize,
          totalChunks: totalChunksSize,
          tempDir: taskTempDir,
          ownerId: userId,
          uploadedChunks: [],
        });
        console.log(task);
      }
      // 返回给前端：任务ID + 已上传的分片索引（前端用这个过滤不用传的片）
      successResponse(res, {
        status: "UPLOADING",
        uploadId: task._id,
        uploadedChunks: task.uploadedChunks,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "初始化失败" });
    }
  }),
);

/**
 * 2. 分片上传 (Chunk)
 */
router.post(
  "/uploadchunk",
  requireAuth,
  upload.single("chunk"),
  asyncHandler(async (req, res) => {
    const { uploadId, chunkIndex } = req.body;
    const userId = req.user?.id;
    if (!req.file) return res.status(400).send("No chunk file");

    const task = await UploadTask.findOne({ _id: uploadId, ownerId: userId });
    if (!task) {
      await fse.remove(req.file.path);
      return res.status(404).send("Task expired");
    }

    // 将分片移动到任务私有目录
    const chunkPath = path.join(task.tempDir, chunkIndex.toString());
    await fse.move(req.file.path, chunkPath, { overwrite: true });

    // 记录进度
    await UploadTask.updateOne(
      { _id: uploadId },
      { $addToSet: { uploadedChunks: Number(chunkIndex) } },
    );
    res.json({ success: true });
  }),
);

/**
 * 3. 完成合并 (Complete)
 */
router.post(
  "/merge",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const { uploadId } = req.body;
    const userId = req.user?.id;
    const task = await UploadTask.findOne({ _id: uploadId, ownerId: userId });

    if (task && task.totalChunks < task.uploadedChunks.length) {
      UploadTask.deleteOne({ _id: uploadId });
      return res.status(400).send("upload error retry");
    }
    if (!task || task.uploadedChunks.length !== task.totalChunks) {
      return res.status(400).send("Chunks incomplete");
    }

    const finalFilename = `${task.fileHash}${path.extname(task.fileName)}`;
    const finalPath = path.join(UPLOAD_FINAL_DIR, finalFilename);

    // 再次确认全局秒传（防止并发合并）
    const globalExists = await File.findOne({
      hash: task.fileHash,
      status: "active",
    });
    if (!globalExists || !(await fse.pathExists(finalPath))) {
      // 执行流式合并
      console.log("0");
      await fse.ensureFile(finalPath);
      console.log("1");
      const writeStream = fse.createWriteStream(finalPath);
      console.log("2");
      for (let i = 0; i < task.totalChunks; i++) {
        const chunkPath = path.join(task.tempDir, i.toString());
        await pipeline(fse.createReadStream(chunkPath), writeStream, {
          end: i === task.totalChunks - 1,
        });
      }
    }
    // 清理
    await fse.remove(task.tempDir);
    await UploadTask.deleteOne({ _id: uploadId });
    // 写入 File 记录
    const fileDoc = await File.create({
      name: task.fileName,
      size: task.totalSize,
      hash: task.fileHash,
      folderId: task.folderId,
      ownerId: task.ownerId,
      storagePath: finalPath,
      status: "active",
    });
    res.json({ success: true, file: fileDoc });
  }),
);

/**
 * 文件删除接口
 */
router.post(
  "/delete",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const { fileId } = req.body;
    const userId = req.user?.id;
    // 1. 查找并确认文件归属权
    const file = await File.findOne({ _id: fileId, ownerId: userId });

    if (!file) {
      return res.status(404).json({ message: "文件不存在或无权操作" });
    }

    const { storagePath, hash } = file;

    // 2. 从数据库中删除该用户的 File 记录
    await File.deleteOne({ _id: fileId });

    // 3. 【关键】引用计数检查：是否还有其他用户引用了这个物理文件？
    const otherReferences = await File.countDocuments({
      storagePath: storagePath,
      // 如果你支持“回收站”功能，这里要确保回收站里的文件也算引用
    });

    if (otherReferences === 0) {
      // 4. 没有任何人引用了，安全删除物理文件
      // 建议：在生产环境中，物理删除可以放入异步任务或延迟执行
      if (await fse.pathExists(storagePath)) {
        await fse.remove(storagePath);
        console.log(`物理文件已删除: ${storagePath} (Hash: ${hash})`);
      }
    } else {
      console.log(`保留物理文件，仍有 ${otherReferences} 个引用。`);
    }
    res.json({ success: true, message: "文件删除成功" });
  }),
);

// 文件列表接口
router.post(
  "/list",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { parentId } = req.body;
    // 1. 处理 parentId
    // 约定：如果前端传 "root" 或者不传，则查询 parentId 为 null 的根目录
    const currentParentId = !parentId || parentId === "root" ? null : parentId;
    // 2. 并发查询文件夹和文件 (提升响应速度)
    const [subFolders, files] = await Promise.all([
      Folder.find({
        ownerId: userId,
        parentId: currentParentId,
      }).sort({ name: 1 }), // 文件夹按名称排序
      File.find({
        ownerId: userId,
        folderId: currentParentId,
        status: "active",
      }).sort({ createdAt: -1 }), // 文件按上传时间倒序
    ]);
    successResponse(res, {
      folders: subFolders,
      files: files,
    });
  }),
);

router.post(
  "/createfolder",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const { name, parentId } = req.body;
    const userId = req.user?.id;
    const folder = await Folder.create({
      name,
      parentId: parentId || null,
      ownerId: userId,
    });
    successResponse(res, folder);
  }),
);
export default router;
