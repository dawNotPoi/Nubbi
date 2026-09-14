import type { FileListItem } from "@/api/file";
import type { MenuProps } from "antd";
import { Download, Move, Share2, Trash2 } from "lucide-react";

/** 行级操作回调，行尾菜单与右键菜单共用 */
export interface FileRowActionHandlers {
  onDelete: (item: FileListItem) => void;
  onDownload: (item: FileListItem) => void;
  onMove: (item: FileListItem) => void;
  onOpen: (item: FileListItem) => void;
  onShare: (item: FileListItem) => void;
}

/**
 * 构建文件行的操作菜单项，行尾下拉与右键菜单渲染同一份配置。
 * @param item 文件或文件夹条目。
 * @param handlers 操作回调集合。
 * @returns Ant Design 菜单项配置。
 */
export const buildFileRowMenuItems = (
  item: FileListItem,
  handlers: FileRowActionHandlers,
): MenuProps["items"] => {
  const run = (callback: (target: FileListItem) => void) => () => callback(item);
  return [
    ...(item.kind === "file"
      ? [
          {
            key: "download",
            icon: <Download className="size-4" />,
            label: "下载",
            onClick: run(handlers.onDownload),
          },
          {
            key: "share",
            icon: <Share2 className="size-4" />,
            label: "分享",
            onClick: run(handlers.onShare),
          },
        ]
      : []),
    {
      key: "move",
      icon: <Move className="size-4" />,
      label: "移动",
      onClick: run(handlers.onMove),
    },
    { type: "divider" },
    {
      key: "delete",
      danger: true,
      icon: <Trash2 className="size-4" />,
      label: "删除",
      onClick: run(handlers.onDelete),
    },
  ];
};
