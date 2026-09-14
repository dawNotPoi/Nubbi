import type { Note } from "@/api/note";
import { Button, Checkbox, Empty } from "antd";
import { Clock, FileText, Plus } from "lucide-react";
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
  notes: Note[];
  owner: string;
  partiallyVisibleSelected: boolean;
  selectedIds: string[];
  selectedNotes: Note[];
  visibleIds: string[];
  onClearSelection: () => void;
  onCreate: () => void;
  onDelete: (notes: Note[]) => void;
  onMove: (notes: Note[]) => void;
  onOpen: (note: Note) => void;
  onRename: (note: Note, title: string) => void;
  onRetry: () => void;
  onToggle: (checked: boolean, noteId: string) => void;
  onToggleAll: (checked: boolean) => void;
};

export function NoteLibraryTable({
  allVisibleSelected,
  emptyDescription,
  filterText,
  isError,
  isLoading,
  moving,
  notes,
  onClearSelection,
  onCreate,
  onDelete,
  onMove,
  onOpen,
  onRename,
  onRetry,
  onToggle,
  onToggleAll,
  owner,
  partiallyVisibleSelected,
  selectedIds,
  selectedNotes,
  visibleIds,
}: NoteLibraryTableProps) {
  return (
    <section>
      <div className="grid h-11 grid-cols-[40px_minmax(280px,1fr)_minmax(180px,28vw)_132px] items-center border-b border-[#ededeb] text-[14px] text-[#787774]">
        <div className="flex items-center justify-center">
          <Checkbox
            checked={allVisibleSelected}
            disabled={visibleIds.length === 0}
            indeterminate={partiallyVisibleSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
          />
        </div>
        {selectedNotes.length > 0 ? (
          <div className="col-span-3 flex min-w-0 items-center">
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
              <FileText className="size-4 shrink-0" strokeWidth={1.9} />
              <span className="truncate">Page name</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Clock className="size-4 shrink-0" strokeWidth={1.9} />
              <span className="truncate">Last edited time</span>
            </div>
            <div />
          </>
        )}
      </div>

      {isLoading || !owner ? (
        <NoteLibrarySkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Empty description="加载 note 失败" />
          <Button onClick={onRetry}>重试</Button>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Empty description={emptyDescription} />
          {!filterText.trim() ? (
            <Button icon={<Plus className="size-4" />} onClick={onCreate} type="primary">
              新页面
            </Button>
          ) : null}
        </div>
      ) : (
        <ul>
          {notes.map((note) => (
            <NoteLibraryRow
              key={note._id}
              note={note}
              selected={selectedIds.includes(note._id)}
              onDelete={(targetNote) => onDelete([targetNote])}
              onMove={onMove}
              onOpen={onOpen}
              onRename={onRename}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
