import type { Note } from "@/api/note";
import { formatNoteEditedTime } from "@/features/note/model/library";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import type { MenuProps } from "antd";
import { Checkbox, Dropdown } from "antd";
import clsx from "clsx";
import { ChevronRight, FileText, FolderInput, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

type NoteLibraryRowProps = {
  note: Note;
  selected: boolean;
  onDelete: (note: Note) => void;
  onMove: (notes: Note[]) => void;
  onOpen: (note: Note) => void;
  onRename: (note: Note, title: string) => void;
  onToggle: (checked: boolean, noteId: string) => void;
};

export function NoteLibraryRow({
  note,
  onDelete,
  onMove,
  onOpen,
  onRename,
  onToggle,
  selected,
}: NoteLibraryRowProps) {
  const noteTitle = normalizeNoteTitle(note.title);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(noteTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);
  const hasChildren = Array.isArray(note.children) && note.children.length > 0;
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
        "group/note-row grid h-11 cursor-pointer grid-cols-[40px_minmax(280px,1fr)_minmax(180px,28vw)_132px] items-center border-b border-[#efefed] text-[14px] transition-colors",
        "hover:bg-[#f7f7f5] focus-within:bg-[#f7f7f5]",
        selected && "bg-[#f1f1ef]",
      )}
      onClick={() => onToggle(!selected, note._id)}
    >
      <div
        className="relative flex h-full items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className={clsx(
            "flex size-5 items-center justify-center text-[#37352f] transition-opacity",
            selected && "opacity-0",
            !selected && "group-hover/note-row:opacity-0",
            !hasChildren && "invisible",
          )}
        >
          <ChevronRight className="size-4" strokeWidth={2.2} />
        </span>
        <Checkbox
          checked={selected}
          className={clsx(
            "absolute opacity-0 transition-opacity",
            "group-hover/note-row:opacity-100 group-focus-within/note-row:opacity-100",
            selected && "opacity-100",
          )}
          onChange={(event) => onToggle(event.target.checked, note._id)}
        />
      </div>
      <div className="flex min-w-0 items-center gap-2 pr-4 text-[#37352f]">
        <FileText className="size-5 shrink-0 text-[#9b9a97]" />
        {editing ? (
          <input
            ref={inputRef}
            className="h-8 min-w-0 flex-1 rounded-md border border-[#d9d7d2] bg-white px-2 font-medium outline-none shadow-[0_0_0_2px_rgba(35,131,226,0.12)]"
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
            className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left font-medium outline-none hover:bg-[#ededeb] focus-visible:ring-2 focus-visible:ring-[#d3d1cb]"
            onClick={startRename}
            title="重命名"
            type="button"
          >
            {noteTitle}
          </button>
        )}
      </div>
      <span className="truncate text-[#4b5563]">
        {formatNoteEditedTime(note)}
      </span>
      <div className="flex items-center justify-end gap-1 pr-2 opacity-0 transition-opacity group-hover/note-row:opacity-100 group-focus-within/note-row:opacity-100">
        <button
          className="h-7 rounded-md border border-[#d9d7d2] bg-white px-3 text-sm font-medium text-[#37352f] shadow-sm transition-colors hover:border-[#bdbab4] hover:bg-[#f7f7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d3d1cb]"
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
            className="flex size-7 items-center justify-center rounded text-[#9b9a97] hover:bg-[#e9e9e7] hover:text-[#37352f]"
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
