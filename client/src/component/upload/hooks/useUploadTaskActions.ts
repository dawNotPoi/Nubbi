import { cancelUploadTask, FILE_STATS_QUERY_KEY } from "@/api/file";
import { queryClient } from "@/utils/queryClient";
import { removeUploadSession } from "@/features/upload/session";
import {
  uploadTaskAtomFamily,
  uploadTasksAtom,
} from "@/store/atom/FileAtom";
import { UploadStatus } from "@/utils/file";
import { message } from "antd";
import { useStore } from "jotai";
import { useCallback } from "react";

/**
 * 管理上传任务取消和列表清理，取消成功后同步服务端用量。
 * @returns 取消、清除已完成及移除展示条目的操作。
 */
export const useUploadTaskActions = () => {
  const store = useStore();

  const removeTask = useCallback(
    (id: string) => {
      store.set(uploadTasksAtom, (ids) => ids.filter((item) => item !== id));
      uploadTaskAtomFamily.remove(id);
    },
    [store],
  );

  /**
   * 服务端取消成功后移除任务并刷新预留空间，失败时保留条目。
   * @param id 上传列表中的任务 ID。
   * @returns 取消操作完成的 Promise。
   */
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
        // 等取消接口成功后再刷新服务端用量，失败时继续保留原预留值。
        void queryClient.invalidateQueries({ queryKey: [FILE_STATS_QUERY_KEY] });
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
