import type { Note, SearchNote } from "@/api/note";
import clsx from "clsx";
import { ChevronRight, FileText } from "lucide-react";
import { getNoteChildren, normalizeNoteTitle } from "../model/hierarchy";

type NoteTargetPickerRowProps = {
  active?: boolean;
  disabled?: boolean;
  note: Note | SearchNote;
  onSelect: (note: Note) => void;
};

export function NoteTargetPickerRow({
  active = false,
  disabled = false,
  note,
  onSelect,
}: NoteTargetPickerRowProps) {
  const pathLabel = "pathLabel" in note ? note.pathLabel : "";
  const hasChildren = getNoteChildren(note).length > 0;

  return (
    <button
      className={clsx(
        "group flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left transition-colors",
        "hover:bg-[#f1f1ef] focus-visible:bg-[#f1f1ef] focus-visible:outline-none",
        active && "bg-[#f1f1ef]",
        disabled && "cursor-wait opacity-70",
      )}
      disabled={disabled}
      onClick={() => onSelect(note)}
      type="button"
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-[#9b9a97]">
        {hasChildren ? <ChevronRight className="size-3.5" /> : null}
      </span>
      <FileText className="size-4 shrink-0 text-[#8f8d89]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-5">
          {normalizeNoteTitle(note.title)}
        </span>
        {pathLabel ? (
          <span className="block truncate text-xs leading-4 text-[#9b9a97]">
            {pathLabel}
          </span>
        ) : null}
      </span>
    </button>
  );
}
