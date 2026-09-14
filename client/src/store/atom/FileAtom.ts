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
  onSuccess: (_data, variables) => {
    // 新建成功后仅刷新当前目录列表
    queryClient.invalidateQueries({
      queryKey: ["files", variables.parentId ?? "root"],
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
  status: UploadStatus;
  instance: Uploader;
}

export const uploadTasksAtom = atom<string[]>([]);

export const uploadTaskAtomFamily = atomFamily((_id: String) =>
  atom<UploadTask | null>(null),
);
