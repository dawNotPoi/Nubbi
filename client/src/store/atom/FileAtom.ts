import { atom } from "jotai";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import { atomFamily } from "jotai/utils";
import { deleteFile, getFiles } from "../../api/file";
import { queryClient } from "../../AppProvider";
import { Uploader, UploadStatus } from "../../utils/file";

export const getFilesAtom = atomWithQuery(
  () => ({
    queryKey: ["files"],
    queryFn: async () => {
      const response = await getFiles();
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    gcTime: 10 * 60 * 1000, // 10分钟内保留在内存
  }),
  () => queryClient
);

export const deleteFileAtom = atomWithMutation(() => ({
  mutationFn: deleteFile,
  // 乐观更新：先从本地缓存移除，失败则回滚
  onMutate: async (fileId) => {
    const queryKey = ["files"];
    await queryClient.cancelQueries({ queryKey });
    const previousFiles = queryClient.getQueryData<any[]>(queryKey);
    // 先从本地缓存中过滤掉要删除的文件
    queryClient.setQueryData<any[]>(queryKey, (old = []) =>
      (old as any[]).filter((file) => file._id !== fileId)
    );
    return { previousFiles };
  },
  onError: (error, variables, context) => {
    const queryKey = ["files"];
    // 回滚本地缓存
    if (context?.previousFiles) {
      queryClient.setQueryData(queryKey, context.previousFiles);
    }
    console.error("删除文件失败:", error);
  },
  onSuccess: (data, variables, context) => {
    const queryKey = ["files"];
    queryClient.invalidateQueries({ queryKey });
    console.log("文件删除成功:", variables);
  },
}));

// 上传任务接口
export interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: UploadStatus;
  instance: Uploader;
}

// 上传任务队列
export const uploadTasksAtom = atom<string[]>([]);

// 创建任务原子族
export const uploadTaskAtomFamily = atomFamily((taskId: string) =>
  atom<UploadTask | null>(null)
);
