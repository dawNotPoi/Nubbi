import { Button } from "antd";
import { FolderInput, Trash2 } from "lucide-react";

type NoteLibraryBatchActionBarProps = {
  moving: boolean;
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onMove: () => void;
};

export function NoteLibraryBatchActionBar({
  moving,
  onClear,
  onDelete,
  onMove,
  selectedCount,
}: NoteLibraryBatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-1 rounded-md border border-border-toolbar bg-bg-panel px-2 py-1">
      <span className="px-1 text-xs text-text-muted">已选 {selectedCount}</span>
      <Button
        icon={<FolderInput className="size-4" />}
        loading={moving}
        onClick={onMove}
        size="small"
        type="text"
      >
        移动
      </Button>
      <Button
        danger
        icon={<Trash2 className="size-4" />}
        onClick={onDelete}
        size="small"
        type="text"
      >
        删除
      </Button>
      <Button onClick={onClear} size="small" type="text">
        取消
      </Button>
    </div>
  );
}
