import type { TrashNoteRow as TrashNoteRowModel } from "@/features/note-trash/model/trash";
import { formatDeletedTime } from "@/features/note-trash/model/trash";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { Button, Checkbox, Tooltip } from "antd";
import { Bot, CornerDownRight, FileText, RotateCcw, Trash2, UserRound } from "lucide-react";

type TrashNoteRowProps = {
  busy: boolean;
  row: TrashNoteRowModel;
  selected: boolean;
  showPath: boolean;
  onPurge: () => void;
  onRestore: () => void;
  onToggle: (checked: boolean) => void;
};

const STATUS_LABELS = {
  inbox: "收件箱",
  active: "进行中",
  archived: "已归档",
} as const;

export function TrashNoteRow({
  busy,
  onPurge,
  onRestore,
  onToggle,
  row,
  selected,
  showPath,
}: TrashNoteRowProps) {
  const { note, parentInTrash } = row;
  const sourceLabel = note.source === "agent" ? "Agent" : "我的笔记";
  const statusLabel = STATUS_LABELS[note.status] ?? note.status;
  const SourceIcon = note.source === "agent" ? Bot : UserRound;

  return (
    <li className="grid min-h-[68px] grid-cols-[44px_minmax(0,1fr)_88px] items-center border-b border-border-row transition-colors hover:bg-bg-hover md:min-h-14 md:grid-cols-[40px_minmax(0,1fr)_112px_148px_176px]">
      <div className="flex h-full min-h-11 items-center justify-center">
        <Checkbox
          aria-label={`选择 ${normalizeNoteTitle(note.title)}`}
          checked={selected}
          disabled={busy}
          onChange={(event) => onToggle(event.target.checked)}
        />
      </div>

      <div className="min-w-0 py-2.5 pr-2 md:py-2">
        <div
          className="flex min-w-0 items-center gap-2"
          style={{ paddingInlineStart: `${Math.min(row.depth, 5) * 12}px` }}
        >
          {row.depth > 0 ? (
            <CornerDownRight className="size-[18px] shrink-0 text-text-subtle md:size-4" />
          ) : (
            <FileText className="size-[18px] shrink-0 text-text-subtle md:size-4" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium text-text-primary md:text-sm">
              {normalizeNoteTitle(note.title)}
            </div>
            {showPath && row.pathLabel ? (
              <div className="truncate text-[12px] text-text-subtle md:text-xs">{row.pathLabel}</div>
            ) : null}
            {parentInTrash ? (
              <div className="truncate text-[11px] text-text-subtle md:text-xs">随父级一并恢复</div>
            ) : null}
            <div className="mt-1 flex min-w-0 items-center gap-1 overflow-hidden text-[12px] text-text-muted md:hidden">
              <span className="shrink-0">{sourceLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="shrink-0">{statusLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{formatDeletedTime(note.deletedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-1 text-xs text-text-muted md:flex">
        <SourceIcon className="size-3.5" />
        <span>{sourceLabel} · {statusLabel}</span>
      </div>
      <span className="hidden text-xs text-text-muted md:block">
        {formatDeletedTime(note.deletedAt)}
      </span>

      <div className="grid grid-cols-2 items-center justify-end gap-0.5 md:flex md:gap-1">
        <Tooltip title={parentInTrash ? "请先恢复父级页面" : "恢复到原位置"}>
          <span className="grid place-items-center">
            <Button
              aria-label="恢复"
              className="h-10 w-10 rounded-[8px] p-0 md:h-auto md:w-auto md:rounded-[6px] md:px-2"
              disabled={busy || parentInTrash}
              icon={<RotateCcw className="size-[17px] md:size-4" />}
              onClick={onRestore}
              size="small"
            >
              <span className="hidden lg:inline">恢复</span>
            </Button>
          </span>
        </Tooltip>
        <Button
          aria-label="永久删除"
          className="h-10 w-10 rounded-[8px] p-0 md:h-auto md:w-auto md:rounded-[6px] md:px-2"
          danger
          disabled={busy}
          icon={<Trash2 className="size-[17px] md:size-4" />}
          onClick={onPurge}
          size="small"
          title="永久删除"
          type="text"
        >
          <span className="hidden xl:inline">永久删除</span>
        </Button>
      </div>
    </li>
  );
}
