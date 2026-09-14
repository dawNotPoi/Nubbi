import { Header } from "@/component/Header";
import { MarkdownImportButton } from "@/features/note/components/MarkdownImportButton";
import { NoteLibraryTable } from "@/features/note/components/NoteLibraryTable";
import { NoteLibraryToolbar } from "@/features/note/components/NoteLibraryToolbar";
import { NoteTargetPickerOverlay } from "@/features/note/components/NoteTargetPickerOverlay";
import { useNoteLibraryController } from "@/features/note/hooks/useNoteLibraryController";
import { Button } from "antd";

export default function NoteLibrary() {
  const library = useNoteLibraryController();

  return (
    <div className="min-w-[760px] bg-white text-[#37352f]">
      {library.contextHolder}
      <Header className="bg-white/95" />

      <main className="px-8 pb-16 pt-2 md:px-12 lg:px-[68px]">
        <section className="mb-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h1 className="text-[40px] font-bold leading-none tracking-normal text-[#1f2933]">
              Notes
            </h1>
            <div className="flex items-center gap-2">
              <MarkdownImportButton
                disabled={!library.owner}
                importing={library.importingMarkdown}
                onImport={(files) => void library.importMarkdownFiles(files)}
              />
              <Button
                className="h-9 rounded-md px-4 font-medium"
                onClick={() => void library.createRootNote()}
                type="primary"
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
<<<<<<< HEAD
            tagsFilter={library.tagsFilter}
=======
>>>>>>> 7998882ea17f1aa6fb38ebb6bfa592eb7f8a44a7
            onFilterTextChange={library.setFilterText}
            onPublishedFilterChange={library.setPublishedFilter}
            onSearchOpenChange={library.setSearchOpen}
            onSortModeChange={library.setSortMode}
            onStatusFilterChange={library.setStatusFilter}
<<<<<<< HEAD
            onTagsFilterChange={library.setTagsFilter}
=======
>>>>>>> 7998882ea17f1aa6fb38ebb6bfa592eb7f8a44a7
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
