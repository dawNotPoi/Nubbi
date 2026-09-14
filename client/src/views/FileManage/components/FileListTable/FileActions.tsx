import { Download, FolderInput, MoreHorizontal, Share2 } from "lucide-react";
import type { MouseEvent } from "react";
import type { FileTableRow } from "./fileIcons";

interface FileActionsProps {
  record: FileTableRow;
  onDownload?: (record: FileTableRow) => void;
  onShare?: (record: FileTableRow) => void;
  onMove?: (record: FileTableRow) => void;
  onMore?: (record: FileTableRow) => void;
}

const FileActions = ({
  record,
  onDownload,
  onShare,
  onMove,
  onMore,
}: FileActionsProps) => {
  const handleClick = (
    event: MouseEvent<HTMLButtonElement>,
    callback?: (record: FileTableRow) => void,
  ) => {
    event.stopPropagation();
    callback?.(record);
  };

  return (
    <div className="ml-auto flex items-center gap-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        type="button"
        title="下载"
        onClick={(event) => handleClick(event, onDownload)}
      >
        <Download className="size-4" />
      </button>
      <button
        type="button"
        title="分享"
        onClick={(event) => handleClick(event, onShare)}
      >
        <Share2 className="size-4" />
      </button>
      <button
        type="button"
        title="移动"
        onClick={(event) => handleClick(event, onMove)}
      >
        <FolderInput className="size-4" />
      </button>
      <button
        type="button"
        title="更多"
        onClick={(event) => handleClick(event, onMore)}
      >
        <MoreHorizontal className="size-4" />
      </button>
    </div>
  );
};

export default FileActions;
