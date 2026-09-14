import { cancelUploadTask } from "@/api/file";
import { removeUploadSession } from "@/features/upload/session";
import {
  uploadTaskAtomFamily,
  uploadTasksAtom,
} from "@/store/atom/FileAtom";
import { UploadStatus } from "@/utils/file";
import { message } from "antd";
import { useStore } from "jotai";
import { useCallback } from "react";

export const useUploadTaskActions = () => {
  const store = useStore();

  const removeTask = useCallback(
    (id: string) => {
      store.set(uploadTasksAtom, (ids) => ids.filter((item) => item !== id));
      uploadTaskAtomFamily.remove(id);
    },
    [store],
  );

  const cancelTask = useCallback(
    async (id: string) => {
      const task = store.get(uploadTaskAtomFamily(id));
      if (!task) return;
      try {
        if (task.instance) await task.instance.cancel();
        else if (task.uploadId) {
          await cancelUploadTask(task.uploadId);
          removeUploadSession(task.uploadId);
        }
        removeTask(id);
        void message.success("上传任务已取消");
      } catch (error) {
        void message.error(
          error instanceof Error ? error.message : "上传任务取消失败",
        );
      }
    },
    [removeTask, store],
  );

  const clearFinished = useCallback(() => {
    const ids = store.get(uploadTasksAtom);
    ids.forEach((id) => {
      const task = store.get(uploadTaskAtomFamily(id));
      if (
        task &&
        [UploadStatus.success, UploadStatus.cancelled].includes(task.status)
      ) {
        removeTask(id);
      }
    });
  }, [removeTask, store]);

  return { cancelTask, clearFinished, removeTask };
};
