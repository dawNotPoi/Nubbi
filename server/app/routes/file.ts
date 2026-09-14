import requireAuth from "@/middleware/session";
import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import { UploadTask } from "@/models/file/uploadTask";
import env from "@/lib/env";
import crypto from "crypto";
import express from "express";
import fse from "fs-extra";
import multer from "multer";
import path from "path";
import { pipeline } from "stream/promises";
import { asyncHandler, AuthRequest } from "./../middleware/common";
import { successResponse } from "./utils";

const router = express.Router();

const upload = multer({ dest: "storage/temp_multer/" });
const UPLOAD_TEMP_DIR = path.join(process.cwd(), "storage/temp");
const UPLOAD_FINAL_DIR = path.join(process.cwd(), "storage/uploads");
const PREVIEW_STREAM_TTL_MS = 60 * 60 * 1000;

type PreviewStreamFile = {
  fileId: string;
  userId: string;
  expiresAt: number;
  storagePath: string;
  mimeType?: string | null;
  extension?: string | null;
  name: string;
};

const previewStreamCache = new Map<string, PreviewStreamFile>();

if (!fse.existsSync(UPLOAD_TEMP_DIR)) {
  fse.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

if (!fse.existsSync(UPLOAD_FINAL_DIR)) {
  fse.mkdirSync(UPLOAD_FINAL_DIR, { recursive: true });
}

const collectDescendantFolderIds = (
  folders: Array<{ _id: string; parentId?: string | null }>,
  rootId: string,
) => {
  const childrenMap = new Map<string, string[]>();

  folders.forEach((folder) => {
    const parentKey = folder.parentId ? String(folder.parentId) : "";
    const currentChildren = childrenMap.get(parentKey) ?? [];
    currentChildren.push(String(folder._id));
    childrenMap.set(parentKey, currentChildren);
  });

  const descendants = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = childrenMap.get(currentId) ?? [];

    children.forEach((childId) => {
      if (descendants.has(childId)) return;
      descendants.add(childId);
      queue.push(childId);
    });
  }

  return descendants;
};

const getOwnedActiveFile = async (fileId: string, userId?: string) => {
  if (!userId) return null;

  return File.findOne({
    _id: fileId,
    ownerId: userId,
    status: "active",
  });
};

const ensureFileResourceExists = async (storagePath: string) => {
  return fse.pathExists(storagePath);
};

const normalizeQueryValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }

  return typeof value === "string" ? value : "";
};

const createPreviewSignature = (
  fileId: string,
  userId: string,
  expiresAt: number,
) =>
  crypto
    .createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`${fileId}:${userId}:${expiresAt}`)
    .digest("hex");

const isSafeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const buildPreviewStreamPath = (
  fileId: string,
  userId: string,
  expiresAt: number,
) => {
  const token = createPreviewSignature(fileId, userId, expiresAt);
  const searchParams = new URLSearchParams({
    uid: userId,
    expires: String(expiresAt),
    token,
  });

  return `/file/stream/${encodeURIComponent(fileId)}?${searchParams.toString()}`;
};

const prunePreviewStreamCache = (now = Date.now()) => {
  for (const [token, file] of previewStreamCache.entries()) {
    if (file.expiresAt < now) {
      previewStreamCache.delete(token);
    }
  }
};

const resolveSignedPreviewUserId = (
  fileId: string,
  query: Record<string, unknown>,
) => {
  const userId = normalizeQueryValue(query.uid);
  const expires = normalizeQueryValue(query.expires);
  const token = normalizeQueryValue(query.token);
  const expiresAt = Number(expires);

  if (!userId || !expires || !token || !Number.isFinite(expiresAt)) {
    return null;
  }

  if (expiresAt < Date.now()) {
    return null;
  }

  const expectedToken = createPreviewSignature(fileId, userId, expiresAt);

  return isSafeEqual(token, expectedToken) ? userId : null;
};

const isGenericMimeType = (mimeType?: string | null) => {
  const normalized = (mimeType || "").toLowerCase().trim();
  return (
    !normalized ||
    normalized === "application/octet-stream" ||
    normalized === "binary/octet-stream"
  );
};

const resolveFileResponseType = (file: {
  mimeType?: string | null;
  extension?: string | null;
  name: string;
}) => {
  if (!isGenericMimeType(file.mimeType)) {
    return file.mimeType!;
  }

  return file.extension || path.extname(file.name) || file.mimeType || "bin";
};

const streamFileResponse = async (
  res: express.Response,
  file: {
    storagePath: string;
    mimeType?: string | null;
    extension?: string | null;
    name: string;
  },
  rangeHeader?: string,
) => {
  const stat = await fse.stat(file.storagePath);
  const fileSize = stat.size;
  const inferredType = resolveFileResponseType(file);

  res.type(inferredType);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(file.name)}"`,
  );
  res.setHeader("Cache-Control", "private, max-age=60");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Accept-Ranges", "bytes");

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
      res.status(416).end();
      return;
    }

    let start = match[1] ? Number(match[1]) : 0;
    let end = match[2] ? Number(match[2]) : fileSize - 1;

    if (!match[1] && match[2]) {
      const suffixLength = Number(match[2]);
      start = Math.max(fileSize - suffixLength, 0);
      end = fileSize - 1;
    }

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end < start ||
      start >= fileSize
    ) {
      res.setHeader("Content-Range", `bytes */${fileSize}`);
      res.status(416).end();
      return;
    }

    end = Math.min(end, fileSize - 1);

    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Content-Length", String(end - start + 1));
    fse.createReadStream(file.storagePath, { start, end }).pipe(res);
    return;
  }

  res.setHeader("Content-Length", String(fileSize));
  fse.createReadStream(file.storagePath).pipe(res);
};

const removeOrphanedStorageFiles = async (storagePaths: string[]) => {
  const uniquePaths = [...new Set(storagePaths.filter(Boolean))];

  await Promise.all(
    uniquePaths.map(async (storagePath) => {
      const otherReferences = await File.countDocuments({ storagePath });

      if (otherReferences > 0) {
        console.log(`保留物理文件，仍有 ${otherReferences} 个引用。`);
        return;
      }

      if (await fse.pathExists(storagePath)) {
        await fse.remove(storagePath);
        console.log(`物理文件已删除: ${storagePath}`);
      }
    }),
  );
};

type DeleteTargetKind = "file" | "folder";

type DeleteTarget = {
  id: string;
  kind: DeleteTargetKind;
};

const resolveDeleteTargets = async (
  userId: string | undefined,
  targets: DeleteTarget[],
) => {
  const fileIds = [
    ...new Set(
      targets.filter((item) => item.kind === "file").map((item) => item.id),
    ),
  ];
  const folderIds = [
    ...new Set(
      targets.filter((item) => item.kind === "folder").map((item) => item.id),
    ),
  ];

  const directFiles =
    fileIds.length > 0
      ? await File.find({
          _id: { $in: fileIds },
          ownerId: userId,
          status: "active",
        }).select("_id storagePath")
      : [];

  const directFileIds = directFiles.map((file) => String(file._id));
  const missingFileIds = fileIds.filter((id) => !directFileIds.includes(id));

  if (folderIds.length === 0) {
    return {
      filesToDelete: directFiles,
      folderIdsToDelete: [] as string[],
      missingFileIds,
      missingFolderIds: [] as string[],
    };
  }

  const ownedFolders = await Folder.find({ ownerId: userId }).select(
    "_id parentId",
  );
  const ownedFolderIds = new Set(
    ownedFolders.map((folder) => String(folder._id)),
  );
  const foundFolderIds = folderIds.filter((id) => ownedFolderIds.has(id));
  const missingFolderIds = folderIds.filter((id) => !ownedFolderIds.has(id));

  const folderIdsToDelete = new Set<string>();
  foundFolderIds.forEach((folderId) => {
    folderIdsToDelete.add(folderId);
    const descendants = collectDescendantFolderIds(
      ownedFolders.map((folder) => ({
        _id: String(folder._id),
        parentId: folder.parentId ? String(folder.parentId) : null,
      })),
      folderId,
    );

    descendants.forEach((descendantId) => folderIdsToDelete.add(descendantId));
  });

  const nestedFiles =
    folderIdsToDelete.size > 0
      ? await File.find({
          ownerId: userId,
          status: "active",
          folderId: { $in: [...folderIdsToDelete] },
        }).select("_id storagePath")
      : [];

  const allFilesMap = new Map<string, { _id: string; storagePath: string }>();
  [...directFiles, ...nestedFiles].forEach((file) => {
    allFilesMap.set(String(file._id), {
      _id: String(file._id),
      storagePath: file.storagePath,
    });
  });

  return {
    filesToDelete: [...allFilesMap.values()],
    folderIdsToDelete: [...folderIdsToDelete],
    missingFileIds,
    missingFolderIds,
  };
};

const appendChunkToFile = async (chunkPath: string, targetPath: string) => {
  const readStream = fse.createReadStream(chunkPath);
  const writeStream = fse.createWriteStream(targetPath, { flags: "a" });
  await pipeline(readStream, writeStream);
};

router.post(
  "/init",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    try {
      const { fileName, fileHash, totalSize, totalChunksSize, folderId } =
        req.body;

      const userId = req.user?.id;

      if (folderId) {
        const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
        if (!folder) {
          return res.status(403).json({ message: "无权访问该文件夹" });
        }
      }

      const globalFile = await File.findOne({
        hash: fileHash,
        status: "active",
      });

      if (globalFile && fse.existsSync(globalFile.storagePath)) {
        await File.create({
          name: fileName,
          extension: path.extname(fileName),
          mimeType: globalFile.mimeType || "application/octet-stream",
          size: totalSize,
          hash: fileHash,
          folderId: folderId || null,
          ownerId: userId,
          storagePath: globalFile.storagePath,
          status: "active",
        });

        successResponse(res, { needUpload: false }, "restored");
        return;
      }

      let task = await UploadTask.findOne({ fileHash, ownerId: userId });

      if (!task) {
        const taskTempDir = path.join(UPLOAD_TEMP_DIR, fileHash);
        if (!fse.existsSync(taskTempDir)) {
          fse.mkdirSync(taskTempDir);
        }

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
      }

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

router.post(
  "/uploadchunk",
  requireAuth,
  upload.single("chunk"),
  asyncHandler(async (req, res) => {
    const { uploadId, chunkIndex } = req.body;
    const userId = req.user?.id;
    console.log(chunkIndex);
    if (!req.file) {
      return res.status(400).send("No chunk file");
    }

    const task = await UploadTask.findOne({ _id: uploadId, ownerId: userId });
    if (!task) {
      await fse.remove(req.file.path);
      return res.status(404).send("Task expired");
    }

    const chunkPath = path.join(task.tempDir, chunkIndex.toString());
    await fse.move(req.file.path, chunkPath, { overwrite: true });

    await UploadTask.updateOne(
      { _id: uploadId },
      { $addToSet: { uploadedChunks: Number(chunkIndex) } },
    );

    res.json({ success: true });
  }),
);

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

    const globalExists = await File.findOne({
      hash: task.fileHash,
      status: "active",
    });

    if (!globalExists || !(await fse.pathExists(finalPath))) {
      await fse.ensureFile(finalPath);
      await fse.truncate(finalPath, 0);

      for (let i = 0; i < task.totalChunks; i++) {
        const chunkPath = path.join(task.tempDir, i.toString());
        await appendChunkToFile(chunkPath, finalPath);
      }
    }

    await fse.remove(task.tempDir);
    await UploadTask.deleteOne({ _id: uploadId });

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

router.post(
  "/delete",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const { fileId, kind = "file" } = req.body as {
      fileId?: string;
      kind?: DeleteTargetKind;
    };
    const userId = req.user?.id;

    if (!fileId) {
      return res.status(400).json({ message: "对象 id 不能为空" });
    }

    const {
      filesToDelete,
      folderIdsToDelete,
      missingFileIds,
      missingFolderIds,
    } = await resolveDeleteTargets(userId, [{ id: fileId, kind }]);

    if (filesToDelete.length === 0 && folderIdsToDelete.length === 0) {
      return res.status(404).json({ message: "文件不存在或无权操作" });
    }

    if (filesToDelete.length > 0) {
      await File.deleteMany({
        _id: { $in: filesToDelete.map((file) => file._id) },
        ownerId: userId,
        status: "active",
      });
      await removeOrphanedStorageFiles(
        filesToDelete.map((file) => file.storagePath),
      );
    }

    if (folderIdsToDelete.length > 0) {
      await Folder.deleteMany({
        _id: { $in: folderIdsToDelete },
        ownerId: userId,
      });
    }

    successResponse(
      res,
      {
        deletedFileCount: filesToDelete.length,
        deletedFolderCount: folderIdsToDelete.length,
        missingFileIds,
        missingFolderIds,
      },
      kind === "folder" ? "文件夹删除成功" : "文件删除成功",
    );
  }),
);

router.post(
  "/delete-batch",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const { fileIds, targets } = req.body as {
      fileIds?: string[];
      targets?: DeleteTarget[];
    };
    const userId = req.user?.id;

    const normalizedTargets = Array.isArray(targets)
      ? targets
          .filter(
            (item) =>
              item?.id && (item.kind === "file" || item.kind === "folder"),
          )
          .map((item) => ({ id: item.id, kind: item.kind }))
      : Array.isArray(fileIds)
        ? fileIds.filter(Boolean).map((id) => ({ id, kind: "file" as const }))
        : [];

    if (normalizedTargets.length === 0) {
      return res.status(400).json({ message: "targets 不能为空" });
    }

    const {
      filesToDelete,
      folderIdsToDelete,
      missingFileIds,
      missingFolderIds,
    } = await resolveDeleteTargets(userId, normalizedTargets);

    if (filesToDelete.length === 0 && folderIdsToDelete.length === 0) {
      return res.status(404).json({ message: "文件不存在或无权操作" });
    }

    if (filesToDelete.length > 0) {
      await File.deleteMany({
        _id: { $in: filesToDelete.map((file) => file._id) },
        ownerId: userId,
        status: "active",
      });
      await removeOrphanedStorageFiles(
        filesToDelete.map((file) => file.storagePath),
      );
    }

    if (folderIdsToDelete.length > 0) {
      await Folder.deleteMany({
        _id: { $in: folderIdsToDelete },
        ownerId: userId,
      });
    }

    successResponse(
      res,
      {
        deletedCount: filesToDelete.length + folderIdsToDelete.length,
        deletedFileCount: filesToDelete.length,
        deletedFolderCount: folderIdsToDelete.length,
        deletedIds: [
          ...filesToDelete.map((file) => file._id),
          ...folderIdsToDelete,
        ],
        missingFileIds,
        missingFolderIds,
      },
      missingFileIds.length === 0 && missingFolderIds.length === 0
        ? "批量删除成功"
        : "批量删除完成，部分对象不存在或无权操作",
    );
  }),
);

router.post(
  "/list",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { parentId } = req.body;
    const currentParentId = !parentId || parentId === "root" ? null : parentId;

    const [subFolders, files] = await Promise.all([
      Folder.find({
        ownerId: userId,
        parentId: currentParentId,
      }).sort({ name: 1 }),
      File.find({
        ownerId: userId,
        folderId: currentParentId,
        status: "active",
      }).sort({ createdAt: -1 }),
    ]);

    successResponse(res, {
      folders: subFolders,
      files,
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

router.get(
  "/folders",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user?.id;
    const folders = await Folder.find({ ownerId: userId }).sort({ name: 1 });
    successResponse(res, folders);
  }),
);

router.post(
  "/rename",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const { _id, name, kind = "file" } = req.body;
    const userId = req.user?.id;
    const nextName = String(name || "").trim();

    if (!_id || !nextName) {
      return res.status(400).json({ message: "对象 id 和名称不能为空" });
    }

    if (kind === "folder") {
      const folder = await Folder.findOneAndUpdate(
        {
          _id,
          ownerId: userId,
        },
        {
          $set: {
            name: nextName,
          },
        },
        { new: true },
      );

      if (!folder) {
        return res.status(404).json({ message: "文件夹不存在或无权操作" });
      }

      successResponse(res, folder);
      return;
    }

    const file = await File.findOneAndUpdate(
      {
        _id,
        ownerId: userId,
        status: "active",
      },
      {
        $set: {
          name: nextName,
          extension: path.extname(nextName),
        },
      },
      { new: true },
    );

    if (!file) {
      return res.status(404).json({ message: "文件不存在或无权操作" });
    }

    successResponse(res, file);
  }),
);

router.post(
  "/move",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const { _id, kind = "file", targetFolderId } = req.body;
    const userId = req.user?.id;

    if (!_id || !targetFolderId) {
      return res.status(400).json({ message: "对象 id 和目标文件夹不能为空" });
    }

    const targetFolder = await Folder.findOne({
      _id: targetFolderId,
      ownerId: userId,
    });

    if (!targetFolder) {
      return res.status(404).json({ message: "目标文件夹不存在或无权访问" });
    }

    if (kind === "folder") {
      const sourceFolder = await Folder.findOne({ _id, ownerId: userId });

      if (!sourceFolder) {
        return res.status(404).json({ message: "文件夹不存在或无权操作" });
      }

      const sourceFolderId = String(sourceFolder._id);
      const nextParentId = String(targetFolder._id);

      if (sourceFolderId === nextParentId) {
        return res.status(400).json({ message: "不能移动到当前文件夹自身" });
      }

      const folders = await Folder.find({ ownerId: userId }).select(
        "_id parentId",
      );
      const descendantIds = collectDescendantFolderIds(
        folders.map((folder) => ({
          _id: String(folder._id),
          parentId: folder.parentId ? String(folder.parentId) : null,
        })),
        sourceFolderId,
      );

      if (descendantIds.has(nextParentId)) {
        return res
          .status(400)
          .json({ message: "不能移动到当前文件夹的子文件夹中" });
      }

      sourceFolder.parentId = targetFolder._id;
      await sourceFolder.save();
      successResponse(res, sourceFolder);
      return;
    }

    const file = await File.findOneAndUpdate(
      {
        _id,
        ownerId: userId,
        status: "active",
      },
      {
        $set: {
          folderId: targetFolder._id,
        },
      },
      { new: true },
    );

    if (!file) {
      return res.status(404).json({ message: "文件不存在或无权操作" });
    }

    successResponse(res, file);
  }),
);

router.get(
  "/preview-url/:fileId",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const { fileId } = req.params;
    const userId = req.user?.id;

    const file = await getOwnedActiveFile(fileId, userId);

    if (!file) {
      return res.status(404).json({ message: "文件不存在或无权访问" });
    }

    if (!(await ensureFileResourceExists(file.storagePath))) {
      return res.status(404).json({ message: "文件资源不存在" });
    }

    const expiresAt = Date.now() + PREVIEW_STREAM_TTL_MS;
    const token = createPreviewSignature(fileId, userId!, expiresAt);
    const url = buildPreviewStreamPath(fileId, userId!, expiresAt);
    prunePreviewStreamCache();
    previewStreamCache.set(token, {
      fileId,
      userId: userId!,
      expiresAt,
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      extension: file.extension,
      name: file.name,
    });

    successResponse(res, { url, expiresAt });
  }),
);

const handleSignedStreamPreview = async (
  req: AuthRequest,
  res: express.Response,
) => {
  const { fileId } = req.params;
  const userId = resolveSignedPreviewUserId(
    fileId,
    req.query as Record<string, unknown>,
  );

  if (!userId) {
    return res.status(403).json({ message: "预览链接无效或已过期" });
  }

  const token = normalizeQueryValue(req.query.token);
  const expiresAt = Number(normalizeQueryValue(req.query.expires));
  const cachedFile = token ? previewStreamCache.get(token) : undefined;

  if (
    cachedFile &&
    cachedFile.fileId === fileId &&
    cachedFile.userId === userId &&
    cachedFile.expiresAt >= Date.now()
  ) {
    await streamFileResponse(res, cachedFile, req.headers.range);
    return;
  }

  if (cachedFile) {
    previewStreamCache.delete(token);
  }

  const file = await getOwnedActiveFile(fileId, userId);

  if (!file) {
    return res.status(404).json({ message: "文件不存在或无权访问" });
  }

  if (!(await ensureFileResourceExists(file.storagePath))) {
    return res.status(404).json({ message: "文件资源不存在" });
  }

  if (token && Number.isFinite(expiresAt)) {
    previewStreamCache.set(token, {
      fileId,
      userId,
      expiresAt,
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      extension: file.extension,
      name: file.name,
    });
  }

  await streamFileResponse(res, file, req.headers.range);
};

router.head(
  "/stream/:fileId",
  asyncHandler(async (req: AuthRequest, res) => {
    await handleSignedStreamPreview(req, res);
  }),
);

router.get(
  "/stream/:fileId",
  asyncHandler(async (req: AuthRequest, res) => {
    await handleSignedStreamPreview(req, res);
  }),
);

router.get(
  "/download/:fileId",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const { fileId } = req.params;
    const userId = req.user?.id;

    const file = await getOwnedActiveFile(fileId, userId);

    if (!file) {
      return res.status(404).json({ message: "文件不存在或无权访问" });
    }

    if (!(await ensureFileResourceExists(file.storagePath))) {
      return res.status(404).json({ message: "文件资源不存在" });
    }

    return res.download(file.storagePath, file.name);
  }),
);

router.get(
  "/preview/:fileId",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const { fileId } = req.params;
    const userId = req.user?.id;

    const file = await getOwnedActiveFile(fileId, userId);

    if (!file) {
      return res.status(404).json({ message: "文件不存在或无权访问" });
    }

    if (!(await ensureFileResourceExists(file.storagePath))) {
      return res.status(404).json({ message: "文件资源不存在" });
    }

    await streamFileResponse(res, file, req.headers.range);
  }),
);

export default router;
