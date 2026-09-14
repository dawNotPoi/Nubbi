import type { Note } from "@/api/note";
import {
  formatNoteEditedTime,
  type NoteLibraryRow as NoteLibraryRowModel,
  type NoteLibraryViewMode,
} from "@/features/note/model/library";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import type { MenuProps } from "antd";
import { Checkbox, Dropdown } from "antd";
import clsx from "clsx";
import {
  ChevronRight,
  FileText,
  FolderInput,
  LocateFixed,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

type NoteLibraryRowProps = {
  row: NoteLibraryRowModel;
  selected: boolean;
  viewMode: NoteLibraryViewMode;
  onDelete: (note: Note) => void;
  onMove: (notes: Note[]) => void;
  onOpen: (note: Note) => void;
  onRename: (note: Note, title: string) => void;
  onRevealInTree: (noteId: string) => void;
  onToggle: (checked: boolean, noteId: string) => void;
  onToggleExpand: (noteId: string) => void;
};

export function NoteLibraryRow({
  onDelete,
  onMove,
  onOpen,
  onRename,
  onRevealInTree,
  onToggle,
  onToggleExpand,
  row,
  selected,
  viewMode,
}: NoteLibraryRowProps) {
  const { note } = row;
  const noteTitle = normalizeNoteTitle(note.title);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(noteTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);
  const canExpand = viewMode === "tree" && row.hasChildren;
  const menuItems: MenuProps["items"] = [
    {
      key: "move",
      icon: <FolderInput className="size-4" />,
      label: "移动",
      onClick: () => onMove([note]),
    },
    {
      danger: true,
      key: "delete",
      icon: <Trash2 className="size-4" />,
      label: "删除",
      onClick: () => onDelete(note),
    },
  ];

  useEffect(() => {
    setDraftTitle(noteTitle);
  }, [noteTitle]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const startRename = (event: MouseEvent) => {
    event.stopPropagation();
    skipBlurCommitRef.current = false;
    setEditing(true);
  };

  const finishRename = () => {
    skipBlurCommitRef.current = true;
    const nextTitle = normalizeNoteTitle(draftTitle);
    setDraftTitle(nextTitle);
    setEditing(false);

    if (nextTitle !== noteTitle) {
      onRename(note, nextTitle);
    }
  };

  const cancelRename = () => {
    skipBlurCommitRef.current = true;
    setDraftTitle(noteTitle);
    setEditing(false);
  };

  return (
    <li
      className={clsx(
        "group/note-row grid cursor-pointer grid-cols-[40px_minmax(260px,1fr)_minmax(220px,26vw)_minmax(160px,18vw)_132px] items-center border-b border-border-row text-[14px] transition-colors",
        "hover:bg-bg-hover focus-within:bg-bg-hover",
        viewMode === "search" ? "min-h-[54px] py-1" : "h-11",
        selected && "bg-bg-selected",
      )}
      onClick={() => onToggle(!selected, note._id)}
    >
      <div
        className="flex h-full items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          className={clsx(
            "opacity-0 transition-opacity",
            "group-hover/note-row:opacity-100 group-focus-within/note-row:opacity-100",
            selected && "opacity-100",
          )}
          onChange={(event) => onToggle(event.target.checked, note._id)}
        />
      </div>
      <div className="flex min-w-0 items-center pr-4 text-text-primary">
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          style={{ paddingLeft: viewMode === "tree" ? row.depth * 22 : 0 }}
        >
          {viewMode === "tree" ? (
            <button
              className={clsx(
                "flex size-5 shrink-0 items-center justify-center rounded text-text-subtle transition-colors hover:bg-bg-icon-hover hover:text-text-primary",
                !canExpand && "invisible",
              )}
              onClick={(event) => {
                event.stopPropagation();
                if (canExpand) onToggleExpand(note._id);
              }}
              title={row.expanded ? "收起" : "展开"}
              type="button"
            >
              <ChevronRight
                className={clsx(
                  "size-4 transition-transform",
                  row.expanded && "rotate-90",
                )}
                strokeWidth={2.2}
              />
            </button>
          ) : null}
          <FileText className="size-5 shrink-0 text-text-subtle" />
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            {editing ? (
              <input
                ref={inputRef}
                className="h-8 min-w-0 rounded-md border border-border-button bg-white px-2 font-medium outline-none shadow-focus-input"
                onBlur={() => {
                  if (skipBlurCommitRef.current) {
                    skipBlurCommitRef.current = false;
                    return;
                  }
                  finishRename();
                }}
                onChange={(event) => setDraftTitle(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    finishRename();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelRename();
                  }
                }}
                value={draftTitle}
              />
            ) : (
              <button
                className="min-w-0 truncate rounded px-1 py-1 text-left font-medium outline-none hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                onClick={startRename}
                title="重命名"
                type="button"
              >
                {noteTitle}
              </button>
            )}
            {viewMode === "search" && row.pathLabel ? (
              <span className="truncate px-1 text-xs text-text-subtle">
                {row.pathLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <span className="truncate text-[#4b5563]">
        {formatNoteEditedTime(note)}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-1 pr-2">
        <span
          className={clsx(
            "rounded px-1.5 py-0.5 text-xs font-medium",
            note.status === "inbox" && "bg-amber-50 text-amber-700",
            note.status === "active" && "bg-blue-50 text-blue-700",
            note.status === "done" && "bg-emerald-50 text-emerald-700",
            note.status === "archived" && "bg-neutral-100 text-neutral-600",
          )}
        >
          {note.status}
        </span>
        {note.published ? (
          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-700">
            published
          </span>
        ) : null}
        {note.tags.slice(0, 2).map((tag) => (
          <span
            className="max-w-[86px] truncate rounded bg-bg-selected px-1.5 py-0.5 text-xs text-text-muted"
            key={tag}
            title={tag}
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 pr-2 opacity-0 transition-opacity group-hover/note-row:opacity-100 group-focus-within/note-row:opacity-100">
        {viewMode === "search" ? (
          <button
            className="flex size-7 items-center justify-center rounded text-text-subtle hover:bg-bg-icon-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            onClick={(event) => {
              event.stopPropagation();
              onRevealInTree(note._id);
            }}
            title="在树中定位"
            type="button"
          >
            <LocateFixed className="size-4" />
          </button>
        ) : null}
        <button
          className="h-7 rounded-md border border-border-button bg-white px-3 text-sm font-medium text-text-primary shadow-sm transition-colors hover:border-border-button-hover hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(note);
          }}
          type="button"
        >
          打开
        </button>
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
          <button
            className="flex size-7 items-center justify-center rounded text-text-subtle hover:bg-bg-icon-hover hover:text-text-primary"
            onClick={(event) => event.stopPropagation()}
            title="更多"
            type="button"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </Dropdown>
      </div>
    </li>
  );
}
