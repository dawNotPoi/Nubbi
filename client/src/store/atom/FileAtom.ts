import { atom } from "jotai";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import { atomFamily } from "jotai/utils";
import { queryClient } from "../../AppProvider";
import { createFloder, deleteFile, listFiles } from "../../api/file";
import {
  Uploader,
  UploadStatus,
  isActiveUploadStatus,
} from "../../utils/file";

interface BreadcrumbItem {
  id: string;
  name: string;
}

export const breadcrumbsAtom = atom<BreadcrumbItem[]>([]);

// 当前所在目录 id（面包屑最后一项；根目录为 undefined）
export const currentFolderIdAtom = atom((get) => {
  const crumbs = get(breadcrumbsAtom);
  return crumbs[crumbs.length - 1]?.id;
});

export const listFilesAtom = atomWithQuery((get) => {
  const parentId = get(currentFolderIdAtom);
  return {
    // 按目录维度缓存列表，便于精确刷新
    queryKey: ["files", parentId ?? "root"],
    queryFn: () => listFiles(parentId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  };
});

export const createFloderMutationAtom = atomWithMutation(() => ({
  mutationFn: async ({
    parentId,
    name = "新建文件夹",
  }: {
    parentId?: string;
    name?: string;
  }) => {
    return createFloder(name, parentId);
  },
  onSuccess: (response, variables) => {
    if (response.code !== 1 || !response.data?._id) {
      return;
    }

    const queryKey = ["files", variables.parentId ?? "root"];
    queryClient.setQueryData<Awaited<ReturnType<typeof listFiles>>>(
      queryKey,
      (cache) => {
        if (!cache?.data) return cache;

        const nextFolders = [
          ...cache.data.folders.filter(
            (folder) => String(folder._id) !== String(response.data._id),
          ),
          response.data,
        ].sort((left, right) =>
          String(left.name || "").localeCompare(String(right.name || ""), "zh-CN"),
        );

        return {
          ...cache,
          data: {
            ...cache.data,
            folders: nextFolders,
          },
        };
      },
    );

    // 后台同步一次，避免缓存与服务端排序或字段细节漂移。
    queryClient.invalidateQueries({
      queryKey,
      refetchType: "active",
    });
  },
}));

export const deleteFileAtom = atomWithMutation(() => ({
  mutationFn: ({
    _id,
    kind = "file",
  }: {
    _id: string;
    kind?: "file" | "folder";
  }) => deleteFile(_id, kind),
  onSuccess: () => {
    // 刷新所有目录维度的文件列表
    queryClient.invalidateQueries({ queryKey: ["files"] });
  },
}));

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

export const hasActiveUploadAtom = atom((get) => {
  const ids = get(uploadTasksAtom);
  return ids.some((id) => {
    const task = get(uploadTaskAtomFamily(id));
    return Boolean(task && isActiveUploadStatus(task.status));
  });
});

export const activeUploadCountAtom = atom((get) => {
  const ids = get(uploadTasksAtom);
  return ids.reduce((count, id) => {
    const task = get(uploadTaskAtomFamily(id));
    return count + (task && isActiveUploadStatus(task.status) ? 1 : 0);
  }, 0);
});

export const finishedUploadCountAtom = atom((get) => {
  const ids = get(uploadTasksAtom);
  return ids.reduce((count, id) => {
    const task = get(uploadTaskAtomFamily(id));
    return (
      count +
      (task &&
      [UploadStatus.success, UploadStatus.cancelled].includes(task.status)
        ? 1
        : 0)
    );
  }, 0);
});
