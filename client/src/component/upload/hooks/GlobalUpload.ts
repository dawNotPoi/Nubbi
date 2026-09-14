import { queryClient } from "@/AppProvider";
import {
  type UploadTask,
  uploadTaskAtomFamily,
  uploadTasksAtom,
} from "@/store/atom/FileAtom";
import { Uploader, UploadStatus } from "@/utils/file";
import { message } from "antd";
import { useSetAtom, useStore } from "jotai";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_BYTES =
  Number(import.meta.env.VITE_FILE_UPLOAD_MAX_BYTES) || 10 * 1024 ** 3;
const MAX_ACTIVE_TASKS = 5;

export const useGlobalUpload = () => {
  const setUploadTasks = useSetAtom(uploadTasksAtom);
  const store = useStore();

  const removeRestoredPlaceholder = (file: File) => {
    const ids = store.get(uploadTasksAtom);
    let restoredFolderId: string | undefined;
    ids.forEach((id) => {
      const task = store.get(uploadTaskAtomFamily(id));
      if (
        task?.status === UploadStatus.needsFile &&
        task.name === file.name &&
        task.size === file.size
      ) {
        restoredFolderId ??= task.folderId;
        store.set(uploadTasksAtom, (items) =>
          items.filter((item) => item !== id),
        );
        uploadTaskAtomFamily.remove(id);
      }
    });
    return restoredFolderId;
  };

  const createUploadTask = (file: File, folderId?: string) => {
    if (!file || file.size === 0) {
      void message.warning("文件为空，无法上传");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      void message.warning("单个文件不能超过 10GB");
      return;
    }

    const restoredFolderId = removeRestoredPlaceholder(file);
    const targetFolderId = restoredFolderId ?? folderId;
    const hasDuplicate = store.get(uploadTasksAtom).some((id) => {
      const task = store.get(uploadTaskAtomFamily(id));
      return Boolean(
        task &&
          task.name === file.name &&
          task.size === file.size &&
          ![UploadStatus.success, UploadStatus.cancelled].includes(task.status),
      );
    });
    if (hasDuplicate) {
      void message.info("该文件已在上传队列中");
      return;
    }

    const taskId = uuidv4();
    const task: UploadTask = {
      id: taskId,
      name: file.name,
      size: file.size,
      folderId: targetFolderId,
      progress: 0,
      speed: 0,
      status: UploadStatus.pending,
      instance: null,
    };
    store.set(uploadTaskAtomFamily(taskId), task);
    setUploadTasks((ids) => [taskId, ...ids]);

    const instance = new Uploader({
      file,
      folderId: targetFolderId,
      onChange: (snapshot) => {
        store.set(uploadTaskAtomFamily(taskId), (previous) =>
          previous ? { ...previous, ...snapshot } : null,
        );
      },
      onFinish: () => {
        void queryClient.invalidateQueries({
          queryKey: ["files", targetFolderId ?? "root"],
        });
        void message.success(`${file.name} 上传完成`);
      },
    });
    store.set(uploadTaskAtomFamily(taskId), (previous) =>
      previous ? { ...previous, instance } : null,
    );
    void instance.upload();
  };

  const createUploadTasks = (files: File[], folderId?: string) => {
    const currentTasks = store
      .get(uploadTasksAtom)
      .map((id) => store.get(uploadTaskAtomFamily(id)))
      .filter((task): task is UploadTask => Boolean(task));
    const unfinished = currentTasks.filter((task) => {
      return Boolean(
        ![UploadStatus.success, UploadStatus.cancelled].includes(task.status),
      );
    }).length;
    const resumable = files.filter((file) =>
      currentTasks.some(
        (task) =>
          task.status === UploadStatus.needsFile &&
          task.name === file.name &&
          task.size === file.size,
      ),
    ).length;
    const available = Math.max(
      0,
      MAX_ACTIVE_TASKS - unfinished + resumable,
    );
    files.slice(0, available).forEach((file) => createUploadTask(file, folderId));
    if (files.length > available) {
      void message.warning(`最多保留 ${MAX_ACTIVE_TASKS} 个未完成上传任务`);
    }
  };

  return { createUploadTask, createUploadTasks };
};
