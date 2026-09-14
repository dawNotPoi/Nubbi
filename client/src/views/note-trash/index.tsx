import { Header } from "@/component/Header";
import { TrashBatchBar } from "@/features/note-trash/components/TrashBatchBar";
import { TrashNoteList } from "@/features/note-trash/components/TrashNoteList";
import { TrashToolbar } from "@/features/note-trash/components/TrashToolbar";
import { useNoteTrashController } from "@/features/note-trash/hooks/useNoteTrashController";
import { Trash2 } from "lucide-react";

export default function NoteTrash() {
  const trash = useNoteTrashController();
  const hasFilters = Boolean(trash.filterText.trim()) || trash.sourceFilter !== "all";

  return (
    <div className="min-h-full min-w-0 bg-background text-text-primary">
      {trash.contextHolder}
      <Header>
        <span className="text-sm font-medium text-text-muted">回收站</span>
      </Header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-8 lg:px-12">
        <div className="mb-5 flex items-start gap-3">
          <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-md bg-bg-selected text-text-muted">
            <Trash2 className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">回收站</h1>
            <p className="mt-1 text-sm text-text-muted">
              恢复会保留原有层级；永久删除不可撤销。
            </p>
          </div>
        </div>

        <TrashToolbar
          disabled={trash.busy}
          filterText={trash.filterText}
          onFilterTextChange={trash.setFilterText}
          onRefresh={() => void trash.refetch()}
          onSourceFilterChange={trash.setSourceFilter}
          refreshing={trash.isFetching && !trash.isLoading}
          sourceFilter={trash.sourceFilter}
          total={trash.notes.length}
        />

        <TrashBatchBar
          busy={trash.busy}
          onClear={trash.clearSelection}
          onPurge={() => trash.confirmPurge(trash.selectedNotes)}
          onRestore={() => void trash.restoreNotes(trash.selectedNotes)}
          restoreBlocked={trash.restoreBlocked}
          selectedCount={trash.selectedNotes.length}
          topLevelCount={trash.actionNotes.length}
        />

        <TrashNoteList
          allVisibleSelected={trash.allVisibleSelected}
          busy={trash.busy}
          emptyDescription={hasFilters ? "没有匹配的回收站笔记" : "回收站为空"}
          isError={trash.isError}
          isLoading={trash.isLoading}
          onPurge={(row) => trash.confirmPurge([row.note])}
          onRestore={(row) => void trash.restoreNotes([row.note])}
          onRetry={() => void trash.refetch()}
          onToggle={trash.toggleSelected}
          onToggleAll={trash.toggleAllVisible}
          partiallyVisibleSelected={trash.partiallyVisibleSelected}
          rows={trash.rows}
          selectedIds={trash.selectedIds}
          showPath={hasFilters}
        />
      </main>
    </div>
  );
}
