import {
  createFloder,
  deleteFile,
  deleteTargetsBatch,
  FILE_LIST_QUERY_KEY,
  fileDirectoryQueryKey,
  moveFileItemsBatch,
  renameFile,
  type FileListItem,
} from "@/api/file";
import { FILE_PAGE_SIZE, getErrorMessage } from "@/features/file/model";
import { useQueryClient } from "@tanstack/react-query";
import { Modal, message } from "antd";
import { useState, type Dispatch, type SetStateAction } from "react";

type MessageApi = ReturnType<typeof message.useMessage>[0];
type ModalApi = ReturnType<typeof Modal.useModal>[0];

interface UseFileManagerActionsOptions {
  items: FileListItem[];
  messageApi: MessageApi;
  modalApi: ModalApi;
  moveTargets: FileListItem[];
  offset: number;
  parentId?: string;
  selectedItems: FileListItem[];
  setEditingId: Dispatch<SetStateAction<string | null>>;
  setMoveOpen: Dispatch<SetStateAction<boolean>>;
  setMoveTargets: Dispatch<SetStateAction<FileListItem[]>>;
  setOffset: Dispatch<SetStateAction<number>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  resetForCreate: () => void;
}

export function useFileManagerActions(options: UseFileManagerActionsOptions) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const refreshDirectory = (parentId: string | null | undefined) =>
    queryClient.invalidateQueries({ queryKey: fileDirectoryQueryKey(parentId) });
  const refreshSourceDirectory = () => refreshDirectory(options.parentId);
  const removeDescendantCaches = (folderIds: string[]) => {
    const affected = new Set(folderIds);
    if (affected.size === 0) return;
    queryClient.removeQueries({
      predicate: (query) => {
        if (query.queryKey[0] !== FILE_LIST_QUERY_KEY) return false;
        const response = query.state.data as {
          data?: { breadcrumbs?: Array<{ _id: string | null }> };
        } | undefined;
        return Boolean(response?.data?.breadcrumbs?.some(
          (crumb) => crumb._id && affected.has(crumb._id),
        ));
      },
    });
  };

  const createFolder = async () => {
    options.resetForCreate();
    setCreating(true);
    try {
      const response = await createFloder("新建文件夹", options.parentId);
      if (response.code !== 1 || !response.data?._id) {
        options.messageApi.error(response.message || "新建文件夹失败");
        return;
      }
      await refreshSourceDirectory();
      options.setEditingId(String(response.data._id));
    } catch (error) {
      options.messageApi.error(getErrorMessage(error, "新建文件夹失败"));
    } finally {
      setCreating(false);
    }
  };

  const rename = async (item: FileListItem, name: string) => {
    try {
      const response = await renameFile(item._id, name, item.kind);
      if (response.code !== 1) {
        options.messageApi.error(response.message || "重命名失败");
        return false;
      }
      options.messageApi.success("重命名成功");
      if (item.kind === "folder") removeDescendantCaches([item._id]);
      await refreshSourceDirectory();
      return true;
    } catch (error) {
      options.messageApi.error(getErrorMessage(error, "重命名失败"));
      return false;
    }
  };

  const afterDelete = async (
    removedTopLevelCount: number,
    removedFolderIds: string[] = [],
  ) => {
    options.setSelectedIds([]);
    options.setEditingId(null);
    removeDescendantCaches(removedFolderIds);
    if (removedTopLevelCount >= options.items.length && options.offset > 0) {
      options.setOffset(Math.max(0, options.offset - FILE_PAGE_SIZE));
    }
    await refreshSourceDirectory();
  };

  const deleteOne = (item: FileListItem) => {
    options.modalApi.confirm({
      title: item.kind === "folder" ? "删除文件夹" : "删除文件",
      content:
        item.kind === "folder"
          ? "文件夹及其全部内容将被永久删除，且无法恢复。"
          : "文件将被永久删除，且无法恢复。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          const response = await deleteFile(item._id, item.kind);
          if (response.code !== 1) throw new Error(response.message || "删除失败");
          options.messageApi.success("删除成功");
          await afterDelete(1, item.kind === "folder" ? [item._id] : []);
        } catch (error) {
          options.messageApi.error(getErrorMessage(error, "删除失败"));
        }
      },
    });
  };

  const deleteSelected = () => {
    if (options.selectedItems.length === 0) return;
    const targets = options.selectedItems.map(({ _id, kind }) => ({ id: _id, kind }));
    options.modalApi.confirm({
      title: `删除选中的 ${targets.length} 项`,
      content: "所选项目及文件夹内的全部内容将被永久删除，且无法恢复。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          const response = await deleteTargetsBatch(targets);
          if (response.code !== 1) throw new Error(response.message || "批量删除失败");
          const missing = response.data.missingFileIds.length + response.data.missingFolderIds.length;
          if (missing > 0) options.messageApi.warning(`已删除 ${response.data.deletedCount} 项，${missing} 项未处理`);
          else options.messageApi.success(`已删除 ${response.data.deletedCount} 项`);
          const deletedIds = new Set(response.data.deletedIds);
          const removedTargets = targets.filter(({ id }) => deletedIds.has(id));
          await afterDelete(
            removedTargets.length,
            removedTargets.filter(({ kind }) => kind === "folder").map(({ id }) => id),
          );
        } catch (error) {
          options.messageApi.error(getErrorMessage(error, "批量删除失败"));
        }
      },
    });
  };

  const openMove = (targets: FileListItem[]) => {
    if (targets.length === 0) return;
    options.setMoveTargets(targets);
    options.setMoveOpen(true);
  };

  const moveTo = async (targetFolderId: string | null) => {
    try {
      const targets = options.moveTargets.map(({ _id, kind }) => ({ id: _id, kind }));
      const response = await moveFileItemsBatch(targets, targetFolderId);
      if (response.code !== 1) throw new Error(response.message || "移动失败");
      const { moved, skipped, failed } = response.data;
      if (failed.length || skipped.length) {
        options.messageApi.warning(`已移动 ${moved.length} 项，跳过 ${skipped.length} 项，失败 ${failed.length} 项`);
      } else options.messageApi.success(`已移动 ${moved.length} 项`);
      options.setSelectedIds([]);
      removeDescendantCaches(
        moved.filter(({ kind }) => kind === "folder").map(({ id }) => id),
      );
      await Promise.all([
        refreshSourceDirectory(),
        refreshDirectory(targetFolderId),
      ]);
      return true;
    } catch (error) {
      options.messageApi.error(getErrorMessage(error, "移动失败"));
      return false;
    }
  };

  return { createFolder, creating, deleteOne, deleteSelected, moveTo, openMove, rename };
}
