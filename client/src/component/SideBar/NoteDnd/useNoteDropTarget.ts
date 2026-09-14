import { Note } from "@/api/note";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import {
  NoteDropData,
  noteDropId,
  useNoteDndState,
} from "./model";

const AUTO_EXPAND_DELAY = 700;

type UseNoteDropTargetOptions = {
  expanded: boolean;
  onExpand: () => void;
};

export function useNoteDropTarget(
  note: Note,
  { expanded, onExpand }: UseNoteDropTargetOptions,
) {
  const { activeNote, blockedIds } = useNoteDndState();
  const blocked = blockedIds.has(note._id);
  const isCurrentParent = (activeNote?.parentId ?? null) === note._id;
  const { isOver, setNodeRef } = useDroppable({
    id: noteDropId(note._id),
    data: { type: "note", note } satisfies NoteDropData,
    disabled: !activeNote,
  });

  const onExpandRef = useRef(onExpand);
  onExpandRef.current = onExpand;

  useEffect(() => {
    if (!isOver || blocked || !note.hasChildren || expanded) return;

    const timer = setTimeout(() => {
      onExpandRef.current();
    }, AUTO_EXPAND_DELAY);
    return () => clearTimeout(timer);
  }, [isOver, blocked, note.hasChildren, expanded]);

  return {
    setNodeRef,
    dropClassName: clsx(
      isOver &&
        !blocked &&
        !isCurrentParent &&
        "bg-blue-50 ring-1 ring-inset ring-blue-300",
      isOver && blocked && "cursor-not-allowed ring-1 ring-inset ring-red-300",
    ),
  };
}
