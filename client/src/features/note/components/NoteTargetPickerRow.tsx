import type { Note, SearchNote } from "@/api/note";
import clsx from "clsx";
import { ChevronRight, FileText } from "lucide-react";
import { normalizeNoteTitle } from "../model/hierarchy";

type NoteTargetPickerRowProps = {
  active?: boolean;
  disabled?: boolean;
  depth?: number;
  expanded?: boolean;
  hasChildren?: boolean;
  note: Note | SearchNote;
  onSelect: (note: Note) => void;
  onToggle?: (noteId: string) => void;
};

export function NoteTargetPickerRow({
  active = false,
  disabled = false,
  depth = 0,
  expanded = false,
  hasChildren,
  note,
  onSelect,
  onToggle,
}: NoteTargetPickerRowProps) {
  const pathLabel = "pathLabel" in note ? note.pathLabel : "";
  const canExpand = hasChildren ?? note.hasChildren;

  return (
    <div
      className={clsx(
        "group flex min-h-9 w-full items-center gap-1 rounded-md pr-2 text-left transition-colors",
        "hover:bg-bg-hover focus-within:bg-bg-hover",
        active && "bg-bg-hover",
        disabled && "cursor-wait opacity-70",
      )}
      style={{ paddingLeft: 8 + depth * 16 }}
    >
      {canExpand ? (
        <button
          aria-expanded={expanded}
          aria-label={expanded ? "收起子 note" : "展开子 note"}
          className="flex size-5 shrink-0 items-center justify-center rounded text-text-subtle hover:bg-bg-icon-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onToggle?.(note._id);
          }}
          type="button"
        >
          <ChevronRight
            className={clsx("size-3.5 transition-transform", expanded && "rotate-90")}
          />
        </button>
      ) : (
        <span className="size-5 shrink-0" />
      )}
      <button
        className="flex min-w-0 flex-1 items-center gap-2 rounded py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        disabled={disabled}
        onClick={() => onSelect(note)}
        type="button"
      >
        <FileText className="size-4 shrink-0 text-text-subtle" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-5">
            {normalizeNoteTitle(note.title)}
          </span>
          {pathLabel ? (
            <span className="block truncate text-xs leading-4 text-text-subtle">
              {pathLabel}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}
