import type { FileListItem } from "@/api/file";
import type { MenuProps } from "antd";
import { Dropdown } from "antd";
import {
  Download,
  MoreHorizontal,
  Move,
  Share2,
  Trash2,
} from "lucide-react";
import type { MouseEvent, ReactElement } from "react";

interface FileRowActionsProps {
  item: FileListItem;
  onDelete: (item: FileListItem) => void;
  onDownload: (item: FileListItem) => void;
  onMove: (item: FileListItem) => void;
  onOpen: (item: FileListItem) => void;
  onShare: (item: FileListItem) => void;
}

export function FileRowActions(
  props: FileRowActionsProps,
): ReactElement {
  const { item } = props;
  const run = (callback: (item: FileListItem) => void) => callback(item);
  const items: MenuProps["items"] = [
    ...(item.kind === "file"
      ? [
          {
            key: "download",
            icon: <Download className="size-4" />,
            label: "下载",
            onClick: () => run(props.onDownload),
          },
          {
            key: "share",
            icon: <Share2 className="size-4" />,
            label: "分享",
            onClick: () => run(props.onShare),
          },
        ]
      : []),
    {
      key: "move",
      icon: <Move className="size-4" />,
      label: "移动",
      onClick: () => run(props.onMove),
    },
    { type: "divider" },
    {
      key: "delete",
      danger: true,
      icon: <Trash2 className="size-4" />,
      label: "删除",
      onClick: () => run(props.onDelete),
    },
  ];

  const stop = (event: MouseEvent<HTMLElement>) => event.stopPropagation();
  return (
    <div className="file-row-actions" onClick={stop}>
      <button
        className="file-open-button"
        onClick={() => props.onOpen(item)}
        type="button"
      >
        {item.kind === "folder" ? "打开" : "预览"}
      </button>
      <Dropdown menu={{ items }} placement="bottomRight" trigger={["click"]}>
        <button
          aria-label={`${item.name} 更多操作`}
          className="file-more-button"
          onClick={stop}
          type="button"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </Dropdown>
    </div>
  );
}
