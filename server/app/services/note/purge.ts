import logger from "@/common/logger";
import Note from "@/models/note";
import NotePurgeTask from "@/models/notePurgeTask";
import Summary from "@/models/summary";
import { recalculateHasChildren } from "./structure";

export const completePendingNotePurge = async (
  userId: string,
  rootNoteId: string,
): Promise<{ deletedCount: number } | null> => {
  const task = await NotePurgeTask.findOne({ userId, rootNoteId });
  if (!task) return null;

  const targetIds = task.targetIds.map(String);
  try {
    await Note.deleteMany({
      _id: { $in: targetIds },
      userId,
      deletedAt: { $ne: null },
    });
    await Summary.deleteMany({ noteId: { $in: targetIds } });
    await recalculateHasChildren(task.parentId, userId);
    await task.deleteOne();
    return { deletedCount: targetIds.length };
  } catch (error) {
    const lastError = error instanceof Error ? error.message : String(error);
    await NotePurgeTask.updateOne(
      { _id: task._id },
      { $inc: { attempts: 1 }, $set: { lastError } },
    ).catch(() => undefined);
    throw error;
  }
};

export const processPendingNotePurges = async (): Promise<void> => {
  const tasks = await NotePurgeTask.find()
    .select("userId rootNoteId")
    .sort({ updatedAt: 1 })
    .limit(100)
    .lean();

  for (const task of tasks) {
    await completePendingNotePurge(
      task.userId,
      String(task.rootNoteId),
    ).catch((error: unknown) => {
      logger.warn("笔记永久删除任务失败，将在后台重试", {
        userId: task.userId,
        rootNoteId: String(task.rootNoteId),
        error,
      });
    });
  }
};

let maintenanceStarted = false;

export const startNotePurgeMaintenance = (): void => {
  if (maintenanceStarted) return;
  maintenanceStarted = true;

  const run = (): void => {
    void processPendingNotePurges().catch((error: unknown) => {
      logger.error("笔记永久删除队列执行失败", { error });
    });
  };
  run();
  const timer = setInterval(run, 5 * 60 * 1_000);
  timer.unref();
};
