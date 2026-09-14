import { Header } from "@/component/Header";
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
            <Button
              className="h-9 rounded-md px-4 font-medium"
              onClick={() => void library.createRootNote()}
              type="primary"
            >
              新页面
            </Button>
          </div>

          <NoteLibraryToolbar
            filterText={library.filterText}
            searchOpen={library.searchOpen}
            sortMode={library.sortMode}
            onFilterTextChange={library.setFilterText}
            onSearchOpenChange={library.setSearchOpen}
            onSortModeChange={library.setSortMode}
          />
        </section>

        <NoteLibraryTable
          allVisibleSelected={library.allVisibleSelected}
          emptyDescription={library.emptyDescription}
          filterText={library.filterText}
          isError={library.isError}
          isLoading={library.isLoading}
          moving={library.moving}
          notes={library.filteredNotes}
          owner={library.owner}
          partiallyVisibleSelected={library.partiallyVisibleSelected}
          selectedIds={library.selectedIds}
          selectedNotes={library.selectedNotes}
          visibleIds={library.visibleIds}
          onClearSelection={library.clearSelection}
          onCreate={() => void library.createRootNote()}
          onDelete={library.confirmDelete}
          onMove={library.openMoveModal}
          onOpen={library.openNote}
          onRename={library.renameNote}
          onRetry={() => void library.refetch()}
          onToggle={library.toggleSelected}
          onToggleAll={library.toggleAllVisible}
        />
      </main>

      <NoteTargetPickerOverlay
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
