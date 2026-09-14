import type { Note } from "@/api/note";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { FileText } from "lucide-react";
import type { PropsWithChildren } from "react";
import {
  ROOT_FOOTER_DROP_ID,
  ROOT_HEADER_DROP_ID,
  TRASH_DROP_ID,
  type NoteDropData,
  useNoteDndState,
} from "./model";

export function NoteDragPreview({ note }: { note: Note }) {
  return (
    <div className="flex max-w-56 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[13px] text-neutral-700 shadow-md">
      <FileText className="size-4 shrink-0 text-neutral-400" />
      <span className="truncate">{normalizeNoteTitle(note.title)}</span>
    </div>
  );
}

export function RootHeaderDropZone({ children }: PropsWithChildren) {
  const { activeNote } = useNoteDndState();
  const { isOver, setNodeRef } = useDroppable({
    id: ROOT_HEADER_DROP_ID,
    data: { type: "root" } satisfies NoteDropData,
    disabled: !activeNote,
  });
  const canDropToRoot = Boolean(activeNote && activeNote.parentId != null);

  return (
    <div
      className={clsx(
        "rounded-md",
        isOver && canDropToRoot && "bg-blue-50 ring-1 ring-inset ring-blue-300",
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
}

export function RootDropIndicator() {
  const { activeNote } = useNoteDndState();
  const { isOver, setNodeRef } = useDroppable({
    id: ROOT_FOOTER_DROP_ID,
    data: { type: "root" } satisfies NoteDropData,
    disabled: !activeNote,
  });

  if (!activeNote || activeNote.parentId == null) return null;

  return (
    <div
      className={clsx(
        "mt-1 rounded-md border border-dashed border-neutral-300 px-2 py-1.5 text-center text-[12px] text-neutral-400",
        isOver && "border-blue-400 bg-blue-50 text-blue-600",
      )}
      ref={setNodeRef}
    >
      拖到此处移至根级
    </div>
  );
}

export function TrashDropTarget({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  const { activeNote } = useNoteDndState();
  const { isOver, setNodeRef } = useDroppable({
    id: TRASH_DROP_ID,
    data: { type: "trash" } satisfies NoteDropData,
    disabled: !activeNote,
  });

  return (
    <div
      className={clsx(
        "rounded-md",
        className,
        isOver && "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200",
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
}
