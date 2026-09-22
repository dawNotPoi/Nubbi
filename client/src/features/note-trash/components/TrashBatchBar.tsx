import { Button } from "@/components/ui/button";
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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-row bg-surface/98 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg md:static md:flex md:flex-wrap md:items-center md:gap-1 md:border-b md:border-t-0 md:border-border-toolbar md:bg-bg-panel md:px-2 md:py-2 md:backdrop-blur-none">
      <div className="mx-auto max-w-md md:mx-0 md:max-w-none">
        <div className="mb-2 flex items-center justify-between gap-2 px-1 md:mb-0 md:inline-flex">
          <span className="text-[12px] text-text-muted">
            已选 {selectedCount} 项 · 处理 {topLevelCount} 个顶层项
          </span>
          <Button
            className="h-9 rounded-control md:h-auto"
            disabled={busy}
            icon={<X className="size-4" />}
            onClick={onClear}
            size="sm"
            variant="ghost"
          >
            取消
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 md:inline-flex md:items-center md:gap-1">
          <Button
            className="h-11 rounded-control md:h-auto"
            disabled={busy || restoreBlocked}
            icon={<RotateCcw className="size-4" />}
            onClick={onRestore}
            size="sm"
          >
            恢复
          </Button>
          <Button
            className="h-11 rounded-control md:h-auto"
            disabled={busy}
            icon={<Trash2 className="size-4" />}
            onClick={onPurge}
            size="sm"
            variant="destructive"
          >
            永久删除
          </Button>
        </div>
        {restoreBlocked ? (
          <div className="mt-2 px-1 text-[11px] leading-4 text-[var(--danger-text)] md:inline md:ml-2 md:mt-0 md:px-0 md:text-xs">
            选中项的父级仍在回收站，请一并选择父级
          </div>
        ) : null}
      </div>
    </div>
  );
}
