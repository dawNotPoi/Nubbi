import logger from "@/common/logger";
import { File } from "@/models/file/file";
import { UploadTask } from "@/models/file/uploadTask";
import fse from "fs-extra";
import path from "path";
import { fileUploadConfig, MEBIBYTE } from "./config";
import {
  ensureUploadDirectories,
  MULTER_TEMP_DIR,
  UPLOAD_TEMP_DIR,
} from "./storage";

let preparePromise: Promise<void> | null = null;

const migrateNumericFields = async () => {
  await File.collection.updateMany(
    { size: { $type: "string" } },
    [
      {
        $set: {
          size: { $convert: { input: "$size", to: "double", onError: 0 } },
        },
      },
    ],
  );
  await UploadTask.collection.updateMany(
    {},
    [
      {
        $set: {
          totalSize: {
            $convert: { input: "$totalSize", to: "double", onError: 0 },
          },
          status: { $ifNull: ["$status", "uploading"] },
          expiresAt: {
            $ifNull: [
              "$expiresAt",
              { $add: ["$createdAt", fileUploadConfig.taskTtlMs] },
            ],
          },
        },
      },
      {
        $set: {
          chunkSize: {
            $ifNull: [
              "$chunkSize",
              {
                $cond: [
                  { $gte: ["$totalSize", 1024 * MEBIBYTE] },
                  20 * MEBIBYTE,
                  {
                    $cond: [
                      { $gte: ["$totalSize", 100 * MEBIBYTE] },
                      10 * MEBIBYTE,
                      5 * MEBIBYTE,
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ],
  );
};

const ensureIndexes = async () => {
  await UploadTask.collection.dropIndex("ownerId_1_fileHash_1").catch(() => undefined);
  await UploadTask.collection.dropIndex("createdAt_1").catch(() => undefined);
  await UploadTask.collection.dropIndex("owner_hash_size_unique").catch(() => undefined);
  await UploadTask.collection.dropIndex("upload_expiry").catch(() => undefined);
  await File.collection.dropIndex("owner_hash_size_status").catch(() => undefined);
  await Promise.all([
    UploadTask.collection.createIndex(
      { ownerId: 1, fileHash: 1, totalSize: 1 },
      { unique: true },
    ),
    UploadTask.collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    ),
    File.collection.createIndex({ ownerId: 1, hash: 1, size: 1, status: 1 }),
  ]);
};

export const prepareFileUploadInfrastructure = () => {
  preparePromise ??= (async () => {
    await ensureUploadDirectories();
    await migrateNumericFields();
    await ensureIndexes();
  })();
  return preparePromise;
};

const removeStaleEntries = async (
  directory: string,
  activePaths: Set<string>,
  cutoff: number,
) => {
  const entries = await fse.readdir(directory).catch(() => [] as string[]);
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry);
      if (activePaths.has(path.resolve(entryPath))) return;
      const stat = await fse.stat(entryPath).catch(() => null);
      if (stat && stat.mtimeMs < cutoff) await fse.remove(entryPath);
    }),
  );
};

export const cleanupExpiredUploads = async () => {
  await prepareFileUploadInfrastructure();
  const now = new Date();
  const expired = await UploadTask.find({ expiresAt: { $lte: now } })
    .select("tempDir")
    .lean();
  await Promise.all(expired.map((task) => fse.remove(task.tempDir)));
  if (expired.length > 0) {
    await UploadTask.deleteMany({ _id: { $in: expired.map((task) => task._id) } });
  }

  const active = await UploadTask.find({ status: { $ne: "completed" } })
    .select("tempDir")
    .lean();
  const activePaths = new Set(active.map((task) => path.resolve(task.tempDir)));
  const cutoff = Date.now() - fileUploadConfig.taskTtlMs;
  await removeStaleEntries(UPLOAD_TEMP_DIR, activePaths, cutoff);
  await removeStaleEntries(MULTER_TEMP_DIR, new Set(), Date.now() - 60 * 60 * 1000);
};

export const startFileUploadMaintenance = async () => {
  await cleanupExpiredUploads();
  const timer = setInterval(() => {
    void cleanupExpiredUploads().catch((error) => {
      logger.error("上传临时文件清理失败", { error });
    });
  }, 60 * 60 * 1000);
  timer.unref();
};
