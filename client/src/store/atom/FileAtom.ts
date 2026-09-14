import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import {
  Uploader,
  UploadStatus,
  isActiveUploadStatus,
} from "../../utils/file";

export interface UploadTask {
  id: string;
  name: string;
  size: number;
  folderId?: string;
  uploadId?: string;
  progress: number;
  speed: number;
  status: UploadStatus;
  error?: string;
  instance: Uploader | null;
}

export const uploadTasksAtom = atom<string[]>([]);

export const uploadTaskAtomFamily = atomFamily((id: string) => {
  void id;
  return atom<UploadTask | null>(null);
});

export const hasActiveUploadAtom = atom((get) =>
  get(uploadTasksAtom).some((id) => {
    const task = get(uploadTaskAtomFamily(id));
    return Boolean(task && isActiveUploadStatus(task.status));
  }),
);

export const activeUploadCountAtom = atom((get) =>
  get(uploadTasksAtom).reduce((count, id) => {
    const task = get(uploadTaskAtomFamily(id));
    return count + (task && isActiveUploadStatus(task.status) ? 1 : 0);
  }, 0),
);

export const finishedUploadCountAtom = atom((get) =>
  get(uploadTasksAtom).reduce((count, id) => {
    const task = get(uploadTaskAtomFamily(id));
    const finished =
      task &&
      [UploadStatus.success, UploadStatus.cancelled].includes(task.status);
    return count + (finished ? 1 : 0);
  }, 0),
);
