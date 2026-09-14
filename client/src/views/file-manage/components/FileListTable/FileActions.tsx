import type { MenuProps } from "antd";
import { Dropdown } from "antd";
import {
  Download,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { FileTableRow } from "./fileIcons";

interface FileActionsProps {
  record: FileTableRow;
  onDownload?: (record: FileTableRow) => void;
  onShare?: (record: FileTableRow) => void;
  onMove?: (record: FileTableRow) => void;
  onRename?: (record: FileTableRow) => void;
  onDelete?: (record: FileTableRow) => void;
}

const FileActions = ({
  record,
  onDownload,
  onShare,
  onMove,
  onRename,
  onDelete,
}: FileActionsProps) => {
  const handleClick = (
    event: MouseEvent<HTMLButtonElement>,
    callback?: (record: FileTableRow) => void,
  ) => {
    event.stopPropagation();
    callback?.(record);
  };

  const moreItems: MenuProps["items"] = [
    {
      key: "rename",
      icon: <Pencil className="size-4" />,
      label: "重命名",
      onClick: () => onRename?.(record),
    },
    {
      key: "delete",
      icon: <Trash2 className="size-4" />,
      label: "删除",
      danger: true,
      onClick: () => onDelete?.(record),
    },
  ];

  return (
    <div className="ml-auto flex items-center gap-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
      {record.kind === "file" ? (
        <>
          <ControlButton
            title="下载"
            onClick={(event) => handleClick(event, onDownload)}
          >
            <Download className="size-5" />
          </ControlButton>
          <ControlButton
            title="分享"
            onClick={(event) => handleClick(event, onShare)}
          >
            <Share2 className="size-5" />
          </ControlButton>
        </>
      ) : null}
      <ControlButton
        title="移动"
        onClick={(event) => handleClick(event, onMove)}
      >
        <FolderInput className="size-5" />
      </ControlButton>
      <Dropdown
        menu={{ items: moreItems }}
        trigger={["click"]}
        placement="bottomRight"
      >
        <ControlButton
          title="更多"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-5" />
        </ControlButton>
      </Dropdown>
    </div>
  );
};

interface ControlButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  children: ReactNode;
}

const ControlButton = forwardRef<HTMLButtonElement, ControlButtonProps>(
  ({ title, children, className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`rounded-md p-1 hover:bg-gray-200 ${className}`}
      title={title}
      {...props}
    >
      {children}
    </button>
  ),
);

ControlButton.displayName = "ControlButton";

export default FileActions;
