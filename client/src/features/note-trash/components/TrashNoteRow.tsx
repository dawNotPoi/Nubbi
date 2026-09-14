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
    <li className="grid min-h-14 grid-cols-[32px_minmax(0,1fr)_auto] items-center border-b border-border-row px-2 transition-colors hover:bg-bg-hover md:grid-cols-[40px_minmax(0,1fr)_112px_148px_176px]">
      <div className="flex items-center justify-center">
        <Checkbox
          aria-label={`选择 ${normalizeNoteTitle(note.title)}`}
          checked={selected}
          disabled={busy}
          onChange={(event) => onToggle(event.target.checked)}
        />
      </div>

      <div className="min-w-0 py-2 pr-2">
        <div
          className="flex min-w-0 items-center gap-2"
          style={{ paddingInlineStart: `${Math.min(row.depth, 5) * 16}px` }}
        >
          {row.depth > 0 ? (
            <CornerDownRight className="size-4 shrink-0 text-text-subtle" />
          ) : (
            <FileText className="size-4 shrink-0 text-text-subtle" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text-primary">
              {normalizeNoteTitle(note.title)}
            </div>
            {showPath && row.pathLabel ? (
              <div className="truncate text-xs text-text-subtle">{row.pathLabel}</div>
            ) : null}
            {parentInTrash ? (
              <div className="truncate text-xs text-text-subtle">随父级一并恢复</div>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-1 md:hidden">
              <span className="text-xs text-text-muted">{sourceLabel}</span>
              <span className="text-xs text-text-subtle">·</span>
              <span className="text-xs text-text-muted">{statusLabel}</span>
              <span className="text-xs text-text-subtle">·</span>
              <span className="text-xs text-text-muted">{formatDeletedTime(note.deletedAt)}</span>
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

      <div className="flex items-center justify-end gap-1">
        <Tooltip title={parentInTrash ? "请先恢复父级页面" : "恢复到原位置"}>
          <span>
            <Button
              aria-label="恢复"
              disabled={busy || parentInTrash}
              icon={<RotateCcw className="size-4" />}
              onClick={onRestore}
              size="small"
            >
              <span className="hidden lg:inline">恢复</span>
            </Button>
          </span>
        </Tooltip>
        <Button
          aria-label="永久删除"
          danger
          disabled={busy}
          icon={<Trash2 className="size-4" />}
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
