import logger from "@/common/logger";
import { File } from "@/models/file/file";
import { StorageCleanupTask } from "@/models/storageCleanupTask";
import { withFileFolderStructureLock } from "./fileManagement/structureLock";
import fse from "fs-extra";

/** 去重存储路径，剔除空值 */
const uniquePaths = (storagePaths: string[]) =>
  [...new Set(storagePaths.filter(Boolean))];

/** 分批并发执行任务，控制并发量避免瞬时压力过大 */
const runInBatches = async <T>(
  items: T[],
  batchSize: number,
  task: (item: T) => Promise<void>,
) => {
  for (let index = 0; index < items.length; index += batchSize) {
    await Promise.all(items.slice(index, index + batchSize).map(task));
  }
};

/** 入队物理文件清理任务（按 storagePath 去重） */
export const enqueueStorageCleanup = async (
  ownerId: string,
  storagePaths: string[],
): Promise<void> => {
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

/** 执行物理文件清理：无引用时删除磁盘文件，失败记录错误供重试 */
export const processStorageCleanupUnlocked = async (
  ownerId: string,
  storagePaths?: string[],
): Promise<void> => {
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

/** 在文件目录结构锁保护下执行物理文件清理 */
export const processStorageCleanup = (
  ownerId: string,
  storagePaths?: string[],
): Promise<void> => withFileFolderStructureLock(ownerId, () =>
  processStorageCleanupUnlocked(ownerId, storagePaths),
);

let maintenanceStarted = false;

/** 扫描所有清理任务的 owner 并逐个处理 */
export const runStorageCleanupQueue = async (): Promise<void> => {
  const ownerIds = await StorageCleanupTask.distinct("ownerId");
  await runInBatches(ownerIds, 4, async (ownerId) => {
    await processStorageCleanup(ownerId).catch((error) => {
      logger.warn("物理文件清理队列执行失败", { ownerId, error });
    });
  });
};

export const startStorageCleanupMaintenance = (): void => {
  if (maintenanceStarted) return;
  maintenanceStarted = true;
  const run = () => void runStorageCleanupQueue().catch((error) => {
    logger.error("物理文件清理队列启动失败", { error });
  });
  run();
  const timer = setInterval(run, 60 * 60 * 1000);
  timer.unref();
};
