import { Button } from "@/components/ui/button";
import type { ReactElement } from "react";
import { FolderInput, Trash2 } from "lucide-react";

type NoteLibraryBatchActionBarProps = {
  moving: boolean;
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onMove: () => void;
};

/**
 * 组合统一基础按钮，保持批量操作入口及原有回调。
 * @param props 已选数量、移动状态和操作回调。
 * @returns 批量操作栏；无选择时不渲染。
 */
export function NoteLibraryBatchActionBar({
  moving,
  onClear,
  onDelete,
  onMove,
  selectedCount,
}: NoteLibraryBatchActionBarProps): ReactElement | null {
  if (selectedCount === 0) return null;

  return (
    <div className="flex min-h-12 w-full items-center gap-1 rounded-panel bg-surface px-2 py-1.5 shadow-popover md:min-h-0 md:w-auto md:rounded-none md:bg-transparent md:px-0 md:py-0 md:shadow-none">
      <span className="mr-auto px-1 text-[14px] font-medium text-text-primary md:mr-0 md:text-xs md:font-normal md:text-text-muted">
        已选 {selectedCount}
      </span>
      <Button
        className="h-10 rounded-control px-3 md:h-8 md:rounded-compact md:px-2"
        icon={<FolderInput className="size-[18px] md:size-4" />}
        loading={moving}
        onClick={onMove}
        size="toolbar"
        variant="ghost"
      >
        移动
      </Button>
      <Button
        icon={<Trash2 className="size-[18px] md:size-4" />}
        onClick={onDelete}
        className="h-10 rounded-control px-3 text-[color:var(--danger-text)] hover:bg-[var(--danger-bg)] hover:text-[color:var(--danger-text)] md:h-8 md:rounded-compact md:px-2"
        size="toolbar"
        variant="ghost"
      >
        删除
      </Button>
      <Button
        className="h-10 rounded-control px-3 text-text-muted md:h-8 md:rounded-compact md:px-2"
        onClick={onClear}
        size="toolbar"
        variant="ghost"
      >
        取消
      </Button>
    </div>
  );
}
