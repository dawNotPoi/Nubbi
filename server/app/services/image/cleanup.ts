import logger from "@/common/logger";
import Image from "@/models/image";
import ImageCleanupTask from "@/models/imageCleanupTask";
import { deleteGitHubImage } from "./github-storage";

export type ImageCleanupTarget = {
  remotePath: string;
  remoteSha: string;
};

export const enqueueImageCleanup = async (
  ownerId: string,
  targets: ImageCleanupTarget[],
): Promise<void> => {
  await Promise.all(
    targets.map((target) =>
      ImageCleanupTask.updateOne(
        { ownerId, remotePath: target.remotePath },
        {
          $set: { remoteSha: target.remoteSha },
          $setOnInsert: {
            ownerId,
            remotePath: target.remotePath,
            attempts: 0,
          },
        },
        { upsert: true },
      ),
    ),
  );
};

export const processImageCleanup = async (
  ownerId?: string,
): Promise<void> => {
  const tasks = await ImageCleanupTask.find(ownerId ? { ownerId } : {})
    .sort({ updatedAt: 1 })
    .limit(100);

  for (const task of tasks) {
    try {
      const references = await Image.countDocuments({
        remotePath: task.remotePath,
      });
      if (references > 0) {
        await ImageCleanupTask.updateOne(
          { _id: task._id },
          { $set: { updatedAt: new Date() } },
          { timestamps: false },
        );
        continue;
      }
      await deleteGitHubImage(task.remotePath, task.remoteSha);
      await task.deleteOne();
    } catch (error) {
      const lastError =
        error instanceof Error ? error.message : String(error);
      await ImageCleanupTask.updateOne(
        { _id: task._id },
        { $inc: { attempts: 1 }, $set: { lastError } },
      ).catch(() => undefined);
      logger.warn("GitHub 图片清理失败，将由后台任务重试", {
        remotePath: task.remotePath,
        error,
      });
    }
  }
};

let maintenanceStarted = false;

export const startImageCleanupMaintenance = (): void => {
  if (maintenanceStarted) return;
  maintenanceStarted = true;

  const run = (): void => {
    void processImageCleanup().catch((error: unknown) => {
      logger.error("GitHub 图片清理队列执行失败", { error });
    });
  };
  run();
  const timer = setInterval(run, 60 * 60 * 1_000);
  timer.unref();
};
