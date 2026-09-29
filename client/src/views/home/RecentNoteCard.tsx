import type { Note } from "@/api/note";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { formatNoteEditedTime } from "@/features/note/model/library";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";

/**
 * 用文字优先的卡片展示最近笔记，并让整张卡片支持键盘打开。
 * @param props 当前笔记。
 * @returns 可点击的最近笔记卡片。
 */
export function RecentNoteCard({ note }: { note: Note }): ReactElement {
  const navigate = useNavigate();

  return (
    <li className="w-[224px] min-w-[224px] snap-start">
      <button
        type="button"
        className="flex min-h-[150px] w-full flex-col rounded-panel border border-border-row bg-surface px-4 py-4 text-left shadow-soft transition-[border-color,background-color,box-shadow] hover:border-border-button-hover hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        onClick={() => navigate(`/note/${note._id}`)}
        aria-label={`打开笔记：${normalizeNoteTitle(note.title)}`}
      >
        <span
          className="block w-full overflow-hidden break-words text-[15px] font-medium leading-6 text-text-primary [overflow-wrap:anywhere]"
          style={{
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            display: "-webkit-box",
          }}
          title={note.title || "未命名笔记"}
        >
          {normalizeNoteTitle(note.title)}
        </span>
        <span className="mt-auto block pt-5 text-xs text-text-muted">
          {formatNoteEditedTime(note)}
        </span>
      </button>
    </li>
  );
}

/**
 * 加载时保持与文字卡片相同的占位尺寸，避免内容出现后布局跳动。
 * @returns 最近笔记卡片骨架。
 */
export function RecentNoteCardSkeleton(): ReactElement {
  return (
    <li className="flex min-h-[150px] w-[224px] min-w-[224px] snap-start flex-col rounded-panel border border-border-row bg-surface px-4 py-4">
      <div className="h-4 w-full animate-pulse rounded-compact bg-skeleton" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded-compact bg-skeleton" />
      <div className="mt-auto h-3 w-16 animate-pulse rounded-compact bg-skeleton" />
    </li>
  );
}
