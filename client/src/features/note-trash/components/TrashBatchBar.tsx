import { Button } from "antd";
import { RotateCcw, Trash2, X } from "lucide-react";

type TrashBatchBarProps = {
  busy: boolean;
  restoreBlocked: boolean;
  selectedCount: number;
  topLevelCount: number;
  onClear: () => void;
  onPurge: () => void;
  onRestore: () => void;
};

export function TrashBatchBar({
  busy,
  onClear,
  onPurge,
  onRestore,
  restoreBlocked,
  selectedCount,
  topLevelCount,
}: TrashBatchBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border-toolbar bg-bg-panel px-2 py-2">
      <span className="mr-1 text-xs text-text-muted">
        已选 {selectedCount} 项 · 将处理 {topLevelCount} 个顶层项
      </span>
      <Button
        disabled={busy || restoreBlocked}
        icon={<RotateCcw className="size-4" />}
        onClick={onRestore}
        size="small"
      >
        恢复
      </Button>
      <Button
        danger
        disabled={busy}
        icon={<Trash2 className="size-4" />}
        onClick={onPurge}
        size="small"
        type="text"
      >
        永久删除
      </Button>
      <Button
        disabled={busy}
        icon={<X className="size-4" />}
        onClick={onClear}
        size="small"
        type="text"
      >
        取消
      </Button>
      {restoreBlocked ? (
        <span className="text-xs text-destructive-foreground">
          选中项的父级仍在回收站，请一并选择父级
        </span>
      ) : null}
    </div>
  );
}
