import { atom } from "jotai";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import { atomFamily } from "jotai/utils";
import { queryClient } from "../../AppProvider";
import { createFloder, deleteFile, listFiles } from "../../api/file";
import { Uploader, UploadStatus } from "../../utils/file";

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
  mutationFn: deleteFile,
  onSuccess: () => {
    // 刷新所有目录维度的文件列表
    queryClient.invalidateQueries({ queryKey: ["files"] });
  },
}));

export interface UploadTask {
  id: string;
  name: string;
  progress: number;
  speed: number;
  status: UploadStatus;
  instance: Uploader;
}

export const uploadTasksAtom = atom<string[]>([]);

export const uploadTaskAtomFamily = atomFamily((_id: string) =>
  atom<UploadTask | null>(null),
);
