import { useSetAtom, useStore } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { queryClient } from "../../../AppProvider";
import {
  UploadTask,
  uploadTaskAtomFamily,
  uploadTasksAtom,
} from "../../../store/atom/FileAtom";
import { Uploader, UploadStatus } from "../../../utils/file";

export const useGlobalUpload = () => {
  const setUploadTasks = useSetAtom(uploadTasksAtom);
  const store = useStore();
  const createUploadTask = (file: File) => {
    const taskId = uuidv4();
    const task: UploadTask = {
      id: taskId,
      name: file.name,
      progress: 0,
      status: UploadStatus.pending,
      instance: null as unknown as Uploader,
    };
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
