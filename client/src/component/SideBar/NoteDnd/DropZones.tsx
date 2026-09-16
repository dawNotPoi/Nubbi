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
    <div className="flex max-w-56 items-center gap-1.5 rounded-[7px] border border-border-row bg-surface px-2 py-1 text-[13px] text-text-primary shadow-popover">
      <FileText className="size-4 shrink-0 text-text-subtle" />
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
        "rounded-[6px]",
        isOver && canDropToRoot && "bg-brand-soft ring-1 ring-inset ring-[var(--focus-border)]",
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
        "mt-1 rounded-[6px] border border-dashed border-border-button px-2 py-1.5 text-center text-[12px] text-text-subtle",
        isOver && "border-[var(--brand)] bg-brand-soft text-[var(--brand)]",
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
        "rounded-[5px]",
        className,
        isOver && "bg-[var(--danger-bg)] text-[var(--danger-text)] ring-1 ring-inset ring-[var(--danger-text)]/20",
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
}
