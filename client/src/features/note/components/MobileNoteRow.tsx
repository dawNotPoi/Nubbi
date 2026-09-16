import type { Note } from "@/api/note";
import { useLongPress } from "@/hooks/useLongPress";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { formatNoteEditedTime } from "@/features/note/model/library";
import { Check, ChevronRight, FileText, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { MobileNoteActionsSheet } from "./MobileNoteActionsSheet";

type MobileNoteRowProps = {
  note: Note;
  depth?: number;
  expanded?: boolean;
  canExpand?: boolean;
  pathLabel?: string;
  selecting: boolean;
  selected: boolean;
  onDelete: (note: Note) => void;
  onEnterSelection: (note: Note) => void;
  onMove: (note: Note) => void;
  onOpen: (note: Note) => void;
  onRename: (note: Note, title: string) => void;
  onReveal?: (note: Note) => void;
  onToggleExpand?: (noteId: string) => void;
  onToggleSelection: (note: Note, selected: boolean) => void;
};

export function MobileNoteRow({
  canExpand = false,
  depth = 0,
  expanded = false,
  note,
  onDelete,
  onEnterSelection,
  onMove,
  onOpen,
  onRename,
  onReveal,
  onToggleExpand,
  onToggleSelection,
  pathLabel,
  selected,
  selecting,
}: MobileNoteRowProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const title = normalizeNoteTitle(note.title);
  const { consumeTriggered, longPressProps } = useLongPress<HTMLButtonElement>(
    () => onEnterSelection(note),
    { disabled: selecting },
  );

  const handleMainClick = () => {
    if (consumeTriggered()) return;
    if (selecting) {
      onToggleSelection(note, !selected);
      return;
    }
    onOpen(note);
  };

  return (
    <>
      <li
        className={clsx(
          "grid min-h-[68px] grid-cols-[44px_minmax(0,1fr)_44px] items-center border-b border-border-row transition-colors",
          selected && "bg-bg-selected",
        )}
      >
        <div className="grid h-full min-h-11 place-items-center">
          {selecting ? (
            <button
              aria-label={`${selected ? "取消选择" : "选择"}：${title}`}
              aria-pressed={selected}
              className={clsx(
                "grid size-10 place-items-center rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                selected ? "text-[var(--brand)]" : "text-text-subtle active:bg-bg-hover",
              )}
              onClick={() => onToggleSelection(note, !selected)}
              type="button"
            >
              <span
                className={clsx(
                  "grid size-[22px] place-items-center rounded-full border",
                  selected
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-border-button-hover bg-surface",
                )}
              >
                {selected ? <Check className="size-[14px]" strokeWidth={2.5} /> : null}
              </span>
            </button>
          ) : canExpand ? (
            <button
              aria-label={expanded ? "收起子笔记" : "展开子笔记"}
              aria-expanded={expanded}
              className="grid size-10 place-items-center rounded-[8px] text-text-subtle transition-colors active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={() => onToggleExpand?.(note._id)}
              type="button"
            >
              <ChevronRight
                className={clsx("size-[18px] transition-transform", expanded && "rotate-90")}
              />
            </button>
          ) : (
            <span className="grid size-10 place-items-center text-text-subtle">
              <FileText className="size-[18px]" strokeWidth={1.9} />
            </span>
          )}
        </div>

        <button
          {...longPressProps}
          className="min-w-0 py-2.5 pr-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
          onClick={handleMainClick}
          style={{ paddingLeft: Math.min(depth, 5) * 12 }}
          type="button"
        >
          <div className="truncate text-[15px] font-medium leading-5 text-text-primary">{title}</div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-[12px] leading-4 text-text-muted">
            <span className="shrink-0">{formatNoteEditedTime(note)}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{note.status}</span>
            {pathLabel ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{pathLabel}</span>
              </>
            ) : note.tags[0] ? (
              <span className="truncate rounded bg-bg-hover px-1.5 py-0.5">{note.tags[0]}</span>
            ) : null}
          </div>
        </button>

        <div className="grid h-full min-h-11 place-items-center">
          {!selecting ? (
            <button
              aria-label={`更多操作：${title}`}
              className="grid size-10 place-items-center rounded-[8px] text-text-subtle transition-colors active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={() => setActionsOpen(true)}
              type="button"
            >
              <MoreHorizontal className="size-[19px]" />
            </button>
          ) : null}
        </div>
      </li>

      <MobileNoteActionsSheet
        allowReveal={Boolean(onReveal)}
        note={note}
        open={actionsOpen}
        onDelete={onDelete}
        onMove={onMove}
        onOpenChange={setActionsOpen}
        onRename={onRename}
        onReveal={onReveal}
        onSelect={onEnterSelection}
      />
    </>
  );
}
