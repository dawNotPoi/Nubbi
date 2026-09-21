import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import {
  Uploader,
  UploadStatus,
  isActiveUploadStatus,
} from "../../utils/file";

/** 文件上传任务状态描述 */
export interface UploadTask {
  ownerId: string;
  generation: number;
  id: string;
  name: string;
  size: number;
  folderId?: string;
  folderName?: string;
  uploadId?: string;
  progress: number;
  speed: number;
  status: UploadStatus;
  error?: string;
  instance: Uploader | null;
}

/** 所有上传任务的 ID 列表，任务详情按 ID 存储在 atomFamily 中 */
export const uploadTasksAtom = atom<string[]>([]);

/** 按任务 ID 存取单个上传任务详情 */
export const uploadTaskAtomFamily = atomFamily((id: string) => {
  void id;
  return atom<UploadTask | null>(null);
});

/** 是否存在进行中的上传任务 */
export const hasActiveUploadAtom = atom((get) =>
  get(uploadTasksAtom).some((id) => {
    const task = get(uploadTaskAtomFamily(id));
    return Boolean(task && isActiveUploadStatus(task.status));
  }),
);

/** 进行中的上传任务数量 */
export const activeUploadCountAtom = atom((get) =>
  get(uploadTasksAtom).reduce((count, id) => {
    const task = get(uploadTaskAtomFamily(id));
    return count + (task && isActiveUploadStatus(task.status) ? 1 : 0);
  }, 0),
);

/** 已完成（成功或取消）的上传任务数量 */
export const finishedUploadCountAtom = atom((get) =>
  get(uploadTasksAtom).reduce((count, id) => {
    const task = get(uploadTaskAtomFamily(id));
    const finished =
      task &&
      [UploadStatus.success, UploadStatus.cancelled].includes(task.status);
    return count + (finished ? 1 : 0);
  }, 0),
);
