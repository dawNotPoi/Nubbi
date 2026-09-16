import { Header } from "@/component/Header";
import { MarkdownImportButton } from "@/features/note/components/MarkdownImportButton";
import { NoteLibraryTable } from "@/features/note/components/NoteLibraryTable";
import { NoteLibraryToolbar } from "@/features/note/components/NoteLibraryToolbar";
import { NoteTargetPickerOverlay } from "@/features/note/components/NoteTargetPickerOverlay";
import { useNoteLibraryController } from "@/features/note/hooks/useNoteLibraryController";
import { Button } from "@/components/ui/button";
import type { ReactElement } from "react";

/**
 * 在原有笔记库结构中组合主题化控件。
 * @returns 保留现有侧栏、工具栏、表格和移动弹层的笔记库页面。
 */
export default function NoteLibrary(): ReactElement {
  const library = useNoteLibraryController();

  return (
    <div className="min-w-0 bg-surface text-text-primary">
      {library.contextHolder}
      <Header className="bg-surface/95" />

      <main className="px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-3 sm:px-6 md:px-12 md:pb-16 lg:px-[68px]">
        <section className="mb-5">
          <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row">
            <h1 className="text-3xl font-semibold leading-none tracking-[-0.02em] text-text-primary md:text-[40px]">
              Notes
            </h1>
            <div className="grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto">
              <MarkdownImportButton
                disabled={!library.owner}
                importing={library.importingMarkdown}
                onImport={(files) => void library.importMarkdownFiles(files)}
              />
              <Button
                className="h-11 w-full rounded-[8px] px-4 font-medium sm:w-auto md:h-9 md:rounded-md"
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
    </div>
  );
}
