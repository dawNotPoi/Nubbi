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
    <div className="flex items-center gap-1 rounded-md border border-border-toolbar bg-bg-panel px-2 py-1">
      <span className="px-1 text-xs text-text-muted">已选 {selectedCount}</span>
      <Button
        icon={<FolderInput className="size-4" />}
        loading={moving}
        onClick={onMove}
        size="xs"
        variant="ghost"
      >
        移动
      </Button>
      <Button
        icon={<Trash2 className="size-4" />}
        onClick={onDelete}
        className="text-[color:var(--danger-text)] hover:text-[color:var(--danger-text)] hover:bg-[var(--danger-bg)]"
        size="xs"
        variant="ghost"
      >
        删除
      </Button>
      <Button onClick={onClear} size="xs" variant="ghost">
        取消
      </Button>
    </div>
  );
}
