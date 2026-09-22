import type { TrashNoteRow as TrashNoteRowModel } from "@/features/note-trash/model/trash";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock3, FileText, RotateCcw, ShieldAlert } from "lucide-react";
import { TrashNoteRow } from "./TrashNoteRow";

type TrashNoteListProps = {
  allVisibleSelected: boolean;
  busy: boolean;
  emptyDescription: string;
  isError: boolean;
  isLoading: boolean;
  partiallyVisibleSelected: boolean;
  rows: TrashNoteRowModel[];
  selectedIds: string[];
  showPath: boolean;
  onPurge: (row: TrashNoteRowModel) => void;
  onRestore: (row: TrashNoteRowModel) => void;
  onRetry: () => void;
  onToggle: (checked: boolean, noteId: string) => void;
  onToggleAll: (checked: boolean) => void;
};

function TrashSkeleton() {
  return (
    <div aria-label="正在加载回收站" className="animate-pulse">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          className="grid min-h-[68px] grid-cols-[44px_minmax(0,1fr)_88px] items-center gap-2 border-b border-border-row md:h-14 md:min-h-0 md:grid-cols-[32px_minmax(0,1fr)_72px] md:px-2"
          key={index}
        >
          <div className="mx-auto size-4 rounded-compact bg-skeleton" />
          <div className="space-y-2">
            <div className="h-4 w-2/5 rounded-compact bg-skeleton" />
            <div className="h-3 w-1/3 rounded-compact bg-skeleton md:hidden" />
          </div>
          <div className="mx-auto h-9 w-16 rounded-control bg-skeleton md:h-7" />
        </div>
      ))}
    </div>
  );
}

export function TrashNoteList({
  allVisibleSelected,
  busy,
  emptyDescription,
  isError,
  isLoading,
  onPurge,
  onRestore,
  onRetry,
  onToggle,
  onToggleAll,
  partiallyVisibleSelected,
  rows,
  selectedIds,
  showPath,
}: TrashNoteListProps) {
  return (
    <section className="min-w-0 pb-20 md:pb-0">
      <div className="hidden h-10 grid-cols-[40px_minmax(0,1fr)_112px_148px_176px] items-center border-b border-border-toolbar px-2 text-xs text-text-muted md:grid">
        <div className="flex items-center justify-center">
          <Checkbox
            checked={allVisibleSelected}
            disabled={busy || rows.length === 0}
            indeterminate={partiallyVisibleSelected}
            onCheckedChange={onToggleAll}
          />
        </div>
        <div className="flex items-center gap-2"><FileText className="size-4" />页面</div>
        <span>来源 / 状态</span>
        <div className="flex items-center gap-2"><Clock3 className="size-4" />删除时间</div>
        <div className="flex items-center gap-2"><RotateCcw className="size-4" />恢复 / 永久删除</div>
      </div>

      {isLoading ? (
        <TrashSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <FileText className="size-8 text-text-subtle" aria-hidden="true" />
          <p className="text-sm text-text-muted">回收站加载失败</p>
          <Button className="h-10 rounded-control" onClick={onRetry}>重试</Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <FileText className="size-8 text-text-subtle" aria-hidden="true" />
          <p className="text-sm text-text-muted">{emptyDescription}</p>
        </div>
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map((row) => (
            <TrashNoteRow
              busy={busy}
              key={row.note._id}
              onPurge={() => onPurge(row)}
              onRestore={() => onRestore(row)}
              onToggle={(checked) => onToggle(checked, row.note._id)}
              row={row}
              selected={selectedIds.includes(row.note._id)}
              showPath={showPath}
            />
          ))}
        </ul>
      )}

      {!isLoading && !isError && rows.length > 0 ? (
        <div className="flex items-start gap-2 border-b border-border-toolbar px-2 py-3 text-[11px] leading-4 text-text-subtle md:items-center md:py-2 md:text-xs">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 md:mt-0" />
          永久删除会级联删除子页面，且无法撤销。
        </div>
      ) : null}
    </section>
  );
}
