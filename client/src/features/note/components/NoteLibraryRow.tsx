import type { Note } from "@/api/note";
import {
  formatNoteEditedTime,
  type NoteLibraryRow as NoteLibraryRowModel,
  type NoteLibraryViewMode,
} from "@/features/note/model/library";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import clsx from "clsx";
import {
  ChevronRight,
  FileText,
  FolderInput,
  LocateFixed,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type ReactElement } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

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

/**
 * 保留桌面点击选择、标题重命名及移动端点击打开的交互分工。
 * @param props 行模型、选中状态及原业务回调。
 * @returns 带统一基础控件的笔记行。
 */
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
}: NoteLibraryRowProps): ReactElement {
  const { note } = row;
  const isMobile = useIsMobile();
  const noteTitle = normalizeNoteTitle(note.title);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(noteTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);
  const canExpand = viewMode === "tree" && row.hasChildren;

  useEffect(() => {
    setDraftTitle(noteTitle);
  }, [noteTitle]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  /**
   * 进入原位重命名，阻止点击同时触发整行选择。
   * @param event 标题按钮的点击事件。
   * @returns 无返回值。
   */
  const startRename = (event: MouseEvent): void => {
    event.stopPropagation();
    skipBlurCommitRef.current = false;
    setEditing(true);
  };

  /**
   * 提交实际变化的名称，并阻止 Enter 后的 blur 再次提交。
   * @returns 无返回值。
   */
  const finishRename = (): void => {
    skipBlurCommitRef.current = true;
    const nextTitle = normalizeNoteTitle(draftTitle);
    setDraftTitle(nextTitle);
    setEditing(false);

    if (nextTitle !== noteTitle) {
      onRename(note, nextTitle);
    }
  };

  /**
   * 放弃临时名称，后续 blur 不再提交。
   * @returns 无返回值。
   */
  const cancelRename = (): void => {
    skipBlurCommitRef.current = true;
    setDraftTitle(noteTitle);
    setEditing(false);
  };

  return (
    <li
      className={clsx(
        "group/note-row grid min-h-[72px] cursor-pointer grid-cols-[44px_minmax(0,1fr)_44px] items-center border-b border-border-row text-[15px] transition-colors duration-150 active:bg-bg-selected md:grid-cols-[40px_minmax(260px,1fr)_minmax(220px,26vw)_minmax(160px,18vw)_132px] md:text-[14px]",
        "hover:bg-bg-hover focus-within:bg-bg-hover",
        viewMode === "search" ? "py-1" : "md:h-11 md:min-h-0",
        selected && "bg-bg-selected",
      )}
      onClick={() => {
        if (isMobile) {
          onOpen(note);
          return;
        }
        onToggle(!selected, note._id);
      }}
    >
      <div
        className="flex h-full min-h-11 items-center justify-center"
        onClick={(event) => {
          event.stopPropagation();
          onToggle(!selected, note._id);
        }}
      >
        <Checkbox
          aria-label={`选择笔记：${noteTitle}`}
          checked={selected}
          className={clsx(
            "opacity-100 transition-opacity md:opacity-0",
            "md:group-hover/note-row:opacity-100 md:group-focus-within/note-row:opacity-100",
            selected && "opacity-100 md:opacity-100",
          )}
          onClick={(event) => event.stopPropagation()}
          onCheckedChange={(checked) => onToggle(checked, note._id)}
        />
      </div>
      <div className="flex min-w-0 items-center pr-2 text-text-primary md:pr-4">
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          style={{ paddingLeft: viewMode === "tree" ? row.depth * 18 : 0 }}
        >
          {viewMode === "tree" ? (
            <button
              aria-label={row.expanded ? "收起子笔记" : "展开子笔记"}
              className={clsx(
                "flex size-9 shrink-0 items-center justify-center rounded-[7px] text-text-subtle transition-[background-color,color,transform] active:scale-[0.95] active:bg-bg-selected hover:bg-bg-icon-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:size-5 md:rounded",
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
                  "size-[18px] transition-transform md:size-4",
                  row.expanded && "rotate-90",
                )}
                strokeWidth={2.2}
              />
            </button>
          ) : null}
          <FileText className="size-5 shrink-0 text-[var(--entity-note)]" strokeWidth={1.9} />
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            {editing ? (
              <Input
                ref={inputRef}
                aria-label="重命名笔记"
                className="h-10 min-w-0 rounded-md border border-border-button bg-surface px-2 pl-2 font-medium outline-none shadow-focus-input md:h-8"
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
                  if (event.nativeEvent.isComposing) return;
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
                className="min-w-0 truncate rounded-[6px] px-1 py-2 text-left font-medium outline-none active:bg-bg-hover hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-focus-ring md:rounded md:py-1"
                onClick={(event) => {
                  if (isMobile) {
                    event.stopPropagation();
                    onOpen(note);
                    return;
                  }
                  startRename(event);
                }}
                title={isMobile ? "打开笔记" : "重命名"}
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
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden px-1 text-[12px] text-text-muted md:hidden">
              <span className="shrink-0">{formatNoteEditedTime(note)}</span>
              <span aria-hidden="true">·</span>
              <span className="shrink-0">{note.status}</span>
              {note.tags[0] ? (
                <span className="truncate rounded bg-bg-selected px-1.5 py-0.5">
                  {note.tags[0]}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <span className="hidden truncate text-text-muted md:block">
        {formatNoteEditedTime(note)}
      </span>
      <div className="hidden min-w-0 flex-wrap items-center gap-1 pr-2 md:flex">
        <span
          className={clsx(
            "rounded px-1.5 py-0.5 text-xs font-medium",
            note.status === "inbox" &&
              "bg-[var(--status-inbox-bg)] text-[var(--status-inbox-text)]",
            note.status === "active" &&
              "bg-[var(--status-active-bg)] text-[var(--status-active-text)]",
            note.status === "archived" &&
              "bg-[var(--status-archived-bg)] text-[var(--status-archived-text)]",
          )}
        >
          {note.status}
        </span>
        {note.published ? (
          <span className="rounded bg-[var(--status-published-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--status-published-text)]">
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
      <div className="flex items-center justify-end gap-1 pr-0.5 opacity-100 transition-opacity md:pr-2 md:opacity-0 md:group-hover/note-row:opacity-100 md:group-focus-within/note-row:opacity-100">
        {viewMode === "search" ? (
          <button
            aria-label="在树中定位"
            className="flex size-10 items-center justify-center rounded-[8px] text-text-subtle transition-[background-color,color,transform] active:scale-[0.95] active:bg-bg-selected hover:bg-bg-icon-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:size-7 md:rounded"
            onClick={(event) => {
              event.stopPropagation();
              onRevealInTree(note._id);
            }}
            title="在树中定位"
            type="button"
          >
            <LocateFixed className="size-[18px] md:size-4" />
          </button>
        ) : null}
        <Button
          variant="outline"
          size="xs"
          className="hidden rounded-md px-3 font-medium md:inline-flex"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(note);
          }}
          type="button"
        >
          打开
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-10 rounded-[8px] md:size-7 md:rounded-[5px]"
                aria-label={`更多操作：${noteTitle}`}
                onClick={(event) => event.stopPropagation()}
                title="更多"
              >
                <MoreHorizontal aria-hidden="true" className="size-[18px] md:size-4" />
              </Button>
            }
          />
          <DropdownMenuContent aria-label="笔记操作">
            <DropdownMenuItem onClick={() => onMove([note])}>
              <FolderInput aria-hidden="true" className="size-4" />
              移动
            </DropdownMenuItem>
            <DropdownMenuItem destructive onClick={() => onDelete(note)}>
              <Trash2 aria-hidden="true" className="size-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
