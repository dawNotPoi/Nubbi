import type { Note } from "@/api/note";
import type {
  NoteLibraryRow as NoteLibraryRowModel,
  NoteLibraryViewMode,
} from "@/features/note/model/library";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CircleAlert, Clock, FileText, NotebookPen, Plus } from "lucide-react";
import { NoteLibraryBatchActionBar } from "./NoteLibraryBatchActionBar";
import { NoteLibraryRow } from "./NoteLibraryRow";
import { NoteLibrarySkeleton } from "./NoteLibrarySkeleton";

type NoteLibraryTableProps = {
  allVisibleSelected: boolean;
  emptyDescription: string;
  filterText: string;
  isError: boolean;
  isLoading: boolean;
  moving: boolean;
  owner: string;
  partiallyVisibleSelected: boolean;
  rows: NoteLibraryRowModel[];
  selectedIds: string[];
  selectedNotes: Note[];
  visibleIds: string[];
  viewMode: NoteLibraryViewMode;
  onClearSelection: () => void;
  onCreate: () => void;
  onDelete: (notes: Note[]) => void;
  onMove: (notes: Note[]) => void;
  onOpen: (note: Note) => void;
  onRename: (note: Note, title: string) => void;
  onRevealInTree: (noteId: string) => void;
  onRetry: () => void;
  onToggle: (checked: boolean, noteId: string) => void;
  onToggleAll: (checked: boolean) => void;
  onToggleExpand: (noteId: string) => void;
};

/**
 * 保留原表格的列宽、批量操作及空态，只替换基础控件。
 * @param props 表格数据、选择状态和原有业务回调。
 * @returns 笔记库表格及其加载、错误和空状态。
 */
export function NoteLibraryTable({
  allVisibleSelected,
  emptyDescription,
  filterText,
  isError,
  isLoading,
  moving,
  onClearSelection,
  onCreate,
  onDelete,
  onMove,
  onOpen,
  onRename,
  onRevealInTree,
  onRetry,
  onToggle,
  onToggleAll,
  onToggleExpand,
  owner,
  partiallyVisibleSelected,
  rows,
  selectedIds,
  selectedNotes,
  visibleIds,
  viewMode,
}: NoteLibraryTableProps): ReactElement {
  const hasSelection = selectedNotes.length > 0;

  return (
    <section className={hasSelection ? "pb-20 md:pb-0" : undefined}>
      {hasSelection ? (
        <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-3 right-3 z-40 md:hidden">
          <NoteLibraryBatchActionBar
            moving={moving}
            selectedCount={selectedNotes.length}
            onClear={onClearSelection}
            onDelete={() => onDelete(selectedNotes)}
            onMove={() => onMove(selectedNotes)}
          />
        </div>
      ) : null}
      <div className="hidden h-11 grid-cols-[40px_minmax(260px,1fr)_minmax(220px,26vw)_minmax(160px,18vw)_132px] items-center border-b border-border-row text-[13px] font-medium text-text-muted md:grid">
        <div className="flex items-center justify-center">
          <Checkbox
            aria-label="选择全部可见笔记"
            checked={allVisibleSelected}
            disabled={visibleIds.length === 0}
            indeterminate={partiallyVisibleSelected}
            onCheckedChange={(checked) => onToggleAll(checked)}
          />
        </div>
        {hasSelection ? (
          <div className="col-span-4 flex min-w-0 items-center">
            <NoteLibraryBatchActionBar
              moving={moving}
              selectedCount={selectedNotes.length}
              onClear={onClearSelection}
              onDelete={() => onDelete(selectedNotes)}
              onMove={() => onMove(selectedNotes)}
            />
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="size-4 shrink-0 text-[var(--entity-note)]" strokeWidth={1.9} />
              <span className="truncate">Note name</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Clock className="size-4 shrink-0 text-text-subtle" strokeWidth={1.9} />
              <span className="truncate">Last edited time</span>
            </div>
            <div className="truncate">Status / Tags</div>
            <div />
          </>
        )}
      </div>

      {isLoading || !owner ? (
        <NoteLibrarySkeleton />
      ) : isError ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
          <span className="grid size-11 place-items-center rounded-control bg-[var(--danger-bg)] text-[var(--danger-text)]">
            <CircleAlert className="size-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-text-primary">笔记加载失败</p>
          <p className="mt-1 text-[13px] text-text-muted">请检查连接后重新加载。</p>
          <Button className="mt-4" onClick={onRetry} variant="outline" size="sm">重试</Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
          <span className="grid size-11 place-items-center rounded-control bg-[var(--entity-note-soft)] text-[var(--entity-note)]">
            <NotebookPen className="size-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-text-primary">{emptyDescription}</p>
          <p className="mt-1 text-[13px] text-text-muted">
            {filterText.trim() ? "调整搜索或筛选条件后再试。" : "创建一篇笔记，开始整理内容。"}
          </p>
          {!filterText.trim() ? (
            <Button
              className="mt-4"
              icon={<Plus />}
              onClick={onCreate}
              variant="primary"
              size="sm"
            >
              新页面
            </Button>
          ) : null}
        </div>
      ) : (
        <ul>
          {rows.map((row) => (
            <NoteLibraryRow
              key={row.note._id}
              row={row}
              selected={selectedIds.includes(row.note._id)}
              viewMode={viewMode}
              onDelete={(targetNote) => onDelete([targetNote])}
              onMove={onMove}
              onOpen={onOpen}
              onRename={onRename}
              onRevealInTree={onRevealInTree}
              onToggle={onToggle}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
