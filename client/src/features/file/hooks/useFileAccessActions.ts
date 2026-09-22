import {
  fetchFileDownloadBlob,
  fetchFileShareDownloadUrl,
  type FileListItem,
} from "@/api/file";
import { getErrorMessage, saveBlobAsFile } from "@/features/file/model";
import { isArchivePreviewBlocked } from "@/views/file-manage/components/filePreviewUtils";
import { toast } from "@/components/ui/toast";
import type { Dispatch, SetStateAction } from "react";

interface UseFileAccessActionsOptions {
  setPreviewItem: Dispatch<SetStateAction<FileListItem | null>>;
}

export function useFileAccessActions({
  setPreviewItem,
}: UseFileAccessActionsOptions) {
  const download = async (item: FileListItem) => {
    if (item.kind !== "file") return;
    try {
      const { blob } = await fetchFileDownloadBlob(item._id);
      saveBlobAsFile(blob, item.name || "download");
    } catch (error) {
      toast.error(getErrorMessage(error, "文件下载失败"));
    }
  };

  const preview = (item: FileListItem) => {
    if (item.kind !== "file") return;
    if (isArchivePreviewBlocked(item)) {
      toast.warning("压缩包暂不支持在线预览");
      return;
    }
    setPreviewItem(item);
  };

  const share = async (item: FileListItem) => {
    if (item.kind !== "file") return;
    try {
      const { url } = await fetchFileShareDownloadUrl(item._id);
      await navigator.clipboard.writeText(url);
      toast.success("分享链接已复制，7 天内有效");
    } catch (error) {
      toast.error(getErrorMessage(error, "分享链接生成失败"));
    }
  };

  return { download, preview, share };
}
