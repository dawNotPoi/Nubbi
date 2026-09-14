import logger from "@/common/logger";
import { File } from "@/models/file/file";
import { StorageCleanupTask } from "@/models/storageCleanupTask";
import { withFileFolderStructureLock } from "./fileManagement/structureLock";
import fse from "fs-extra";

const uniquePaths = (storagePaths: string[]) =>
  [...new Set(storagePaths.filter(Boolean))];

const runInBatches = async <T>(
  items: T[],
  batchSize: number,
  task: (item: T) => Promise<void>,
) => {
  for (let index = 0; index < items.length; index += batchSize) {
    await Promise.all(items.slice(index, index + batchSize).map(task));
  }
};

export const enqueueStorageCleanup = async (
  ownerId: string,
  storagePaths: string[],
) => {
  const paths = uniquePaths(storagePaths);
  if (paths.length === 0) return;
  await Promise.all(paths.map((storagePath) =>
    StorageCleanupTask.updateOne(
      { ownerId, storagePath },
      { $setOnInsert: { ownerId, storagePath, attempts: 0 } },
      { upsert: true },
    ),
  ));
};

export const processStorageCleanupUnlocked = async (
  ownerId: string,
  storagePaths?: string[],
) => {
  const paths = storagePaths ? uniquePaths(storagePaths) : undefined;
  const tasks = await StorageCleanupTask.find({
    ownerId,
    ...(paths ? { storagePath: { $in: paths } } : {}),
  });
  await runInBatches(tasks, 8, async (task) => {
    try {
      const references = await File.countDocuments({
        storagePath: task.storagePath,
      });
      if (references === 0) await fse.remove(task.storagePath);
      await task.deleteOne();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await StorageCleanupTask.updateOne(
        { _id: task._id },
        { $inc: { attempts: 1 }, $set: { lastError: message } },
      ).catch(() => undefined);
      logger.warn("物理文件清理失败，将由后台任务重试", {
        storagePath: task.storagePath,
        error,
      });
    }
  });
};

export const processStorageCleanup = (
  ownerId: string,
  storagePaths?: string[],
) => withFileFolderStructureLock(ownerId, () =>
  processStorageCleanupUnlocked(ownerId, storagePaths),
);

let maintenanceStarted = false;

export const runStorageCleanupQueue = async () => {
  const ownerIds = await StorageCleanupTask.distinct("ownerId");
  await runInBatches(ownerIds, 4, async (ownerId) => {
    await processStorageCleanup(ownerId).catch((error) => {
      logger.warn("物理文件清理队列执行失败", { ownerId, error });
    });
  });
};

export const startStorageCleanupMaintenance = () => {
  if (maintenanceStarted) return;
  maintenanceStarted = true;
  const run = () => void runStorageCleanupQueue().catch((error) => {
    logger.error("物理文件清理队列启动失败", { error });
  });
  run();
  const timer = setInterval(run, 60 * 60 * 1000);
  timer.unref();
};
