import { message } from "antd";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { queryClient } from "../../../AppProvider";
import {
  UploadTask,
  hasActiveUploadAtom,
  uploadTaskAtomFamily,
  uploadTasksAtom,
} from "../../../store/atom/FileAtom";
import { Uploader, UploadStatus } from "../../../utils/file";

export const useGlobalUpload = () => {
  const setUploadTasks = useSetAtom(uploadTasksAtom);
  const store = useStore();
  const hasActiveUpload = useAtomValue(hasActiveUploadAtom);

  // Notify about uploads interrupted by a page refresh (BUG-002)
  useEffect(() => {
    const sessions = Uploader.getPendingSessions();
    if (sessions.length === 0) return;
    const names = sessions.map((s) => `"${s.name}"`).join("、");
    void message.warning(
      sessions.length === 1
        ? `${names} 上次上传中断，重新选择该文件可从断点续传`
        : `发现 ${sessions.length} 个中断的上传，重新选择文件可续传：${names}`,
      8,
    );
  }, []);

  // Intercept tab close / refresh while uploads are active (BUG-005)
  useEffect(() => {
    if (!hasActiveUpload) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasActiveUpload]);

  const createUploadTask = (file: File, folderId?: string) => {
    if (!file || file.size === 0) {
      message.warning("文件为空，无法上传");
      return;
    }
    const existingIds = store.get(uploadTasksAtom);
    const hasSameNameTask = existingIds.some((id) => {
      const task = store.get(uploadTaskAtomFamily(id));
      return (
        task &&
        task.name === file.name &&
        [
          UploadStatus.pending,
          UploadStatus.uploading,
          UploadStatus.paused,
        ].includes(task.status)
      );
    });
    if (hasSameNameTask) {
      message.info("已有同名文件在上传队列中");
      return;
    }

    const taskId = uuidv4();
    const task: UploadTask = {
      id: taskId,
      name: file.name,
      progress: 0,
      speed: 0,
      status: UploadStatus.pending,
      instance: null as unknown as Uploader,
    };
    store.set(uploadTaskAtomFamily(taskId), task);
    setUploadTasks((prev) => [taskId, ...prev]);
    const instance = new Uploader({
      file,
      folderId,
      onChange: (status, progress, speed) => {
        store.set(uploadTaskAtomFamily(taskId), (prevTask) =>
          prevTask ? { ...prevTask, status, progress, speed } : null,
        );
      },
      onFinish: () => {
        queryClient.invalidateQueries({ queryKey: ["files"] });
      },
    });
    store.set(uploadTaskAtomFamily(taskId), (prevTask) =>
      prevTask ? { ...prevTask, instance } : null,
    );
    instance.upload();
  };

  return {
    createUploadTask,
  };
};
