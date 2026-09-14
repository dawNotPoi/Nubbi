import { message } from "antd";
import { useSetAtom, useStore } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { queryClient } from "../../../AppProvider";
import {
  UploadTask,
  uploadTaskAtomFamily,
  uploadTasksAtom,
} from "../../../store/atom/FileAtom";
import { Uploader, UploadStatus } from "../../../utils/file";

//管理上传任务状态钩子
export const useGlobalUpload = () => {
  const setUploadTasks = useSetAtom(uploadTasksAtom);
  const store = useStore();
  const createUploadTask = (file: File) => {
    // 简单的上传前检测：空文件和同名未完成任务
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
        [UploadStatus.pending, UploadStatus.uploading, UploadStatus.paused].includes(
          task.status
        )
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
      status: UploadStatus.pending,
      instance: null as unknown as Uploader,
    };
    //持久化存储
    store.set(uploadTaskAtomFamily(taskId), task);
    setUploadTasks((prev) => [taskId, ...prev]);
    const instance = new Uploader({
      file: file,
      onChange: (status, progress) => {
        store.set(uploadTaskAtomFamily(taskId), (prevTask) =>
          prevTask ? { ...prevTask, status, progress } : null
        );
      },
      onFinish: () => {
        //完成后会重新请求队列
        queryClient.invalidateQueries({ queryKey: ["files"] });
      },
    });
    // 绑定 instance
    store.set(uploadTaskAtomFamily(taskId), (prevTask) =>
      prevTask ? { ...prevTask, instance } : null
    );
    instance.upload();
  };

  return {
    createUploadTask,
  };
};
