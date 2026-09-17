import { Header } from "@/component/Header";
import { MarkdownImportButton } from "@/features/note/components/MarkdownImportButton";
import { MobileNoteLibrary } from "@/features/note/components/MobileNoteLibrary";
import { NoteLibraryTable } from "@/features/note/components/NoteLibraryTable";
import { NoteLibraryToolbar } from "@/features/note/components/NoteLibraryToolbar";
import { NoteTargetPickerOverlay } from "@/features/note/components/NoteTargetPickerOverlay";
import { useNoteLibraryController } from "@/features/note/hooks/useNoteLibraryController";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui/button";
import { NotebookPen } from "lucide-react";
import type { ReactElement } from "react";

/** Desktop 保留高密度 NoteLibrary；Mobile 使用独立任务流。 */
export default function NoteLibrary(): ReactElement {
  const library = useNoteLibraryController();
  const isMobile = useIsMobile();

  const moveOverlay = (
    <NoteTargetPickerOverlay
      allNotes={library.allNotes}
      blockedIds={library.blockedMoveTargetIds}
      disabled={library.moving}
      emptyMessage="暂无可移动的位置"
      open={library.moveOpen}
      targets={library.moveTargets}
      onCancel={library.closeMoveModal}
      onSelect={library.moveToTarget}
    />
  );

  if (isMobile) {
    return (
      <>
        {library.contextHolder}
        <MobileNoteLibrary library={library} />
        {moveOverlay}
      </>
    );
  }

  return (
    <div className="min-w-0 bg-surface text-text-primary">
      {library.contextHolder}
      <Header className="bg-surface/95" />

      <main className="px-4 pb-16 pt-5 sm:px-6 md:px-12 lg:px-[68px]">
        <section className="mb-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[var(--entity-note-soft)] text-[var(--entity-note)]">
                <NotebookPen className="size-[18px]" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <h1 className="text-[28px] font-semibold leading-8 tracking-[-0.015em] text-text-primary">
                  Notes
                </h1>
                <p className="mt-1 text-[13px] leading-5 text-text-muted">
                  浏览、筛选并整理你的笔记空间。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MarkdownImportButton
                disabled={!library.owner}
                importing={library.importingMarkdown}
                onImport={(files) => void library.importMarkdownFiles(files)}
              />
              <Button
                className="h-9 rounded-md px-4 font-medium"
                onClick={() => void library.createRootNote()}
                variant="primary"
                size="sm"
              >
                新页面
              </Button>
            </div>
          </div>

          <NoteLibraryToolbar
            availableTags={library.availableTags}
            filterText={library.filterText}
            publishedFilter={library.publishedFilter}
            searchOpen={library.searchOpen}
            sortMode={library.sortMode}
            statusFilter={library.statusFilter}
            tagsFilter={library.tagsFilter}
            onFilterTextChange={library.setFilterText}
            onPublishedFilterChange={library.setPublishedFilter}
            onSearchOpenChange={library.setSearchOpen}
            onSortModeChange={library.setSortMode}
            onStatusFilterChange={library.setStatusFilter}
            onTagsFilterChange={library.setTagsFilter}
          />
        </section>

        <NoteLibraryTable
          allVisibleSelected={library.allVisibleSelected}
          emptyDescription={library.emptyDescription}
          filterText={library.filterText}
          isError={library.isError}
          isLoading={library.isLoading}
          moving={library.moving}
          owner={library.owner}
          partiallyVisibleSelected={library.partiallyVisibleSelected}
          rows={library.libraryRows}
          selectedIds={library.selectedIds}
          selectedNotes={library.selectedNotes}
          visibleIds={library.visibleIds}
          viewMode={library.viewMode}
          onClearSelection={library.clearSelection}
          onCreate={() => void library.createRootNote()}
          onDelete={library.confirmDelete}
          onMove={library.openMoveModal}
          onOpen={library.openNote}
          onRename={library.renameNote}
          onRevealInTree={library.revealInTree}
          onRetry={() => void library.refetch()}
          onToggle={library.toggleSelected}
          onToggleAll={library.toggleAllVisible}
          onToggleExpand={library.toggleLibraryNodeExpanded}
        />
      </main>

      {moveOverlay}
    </div>
  );
}
