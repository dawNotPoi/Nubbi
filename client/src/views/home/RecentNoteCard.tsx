import type { Note } from "@/api/note";
import Image from "@/component/UI/Image";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { formatNoteEditedTime } from "@/features/note/model/library";
import { routes } from "@/utils/routes";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";

/** 当前账号笔记卡片所需的作者展示资料。 */
interface RecentNoteCardProps {
  note: Note;
  authorName: string;
  authorImage: string;
}

/**
 * 纸面卡片以标题和作者头像呈现内容，整卡支持键盘打开。
 * @param props 笔记与当前账号作者资料。
 * @returns 最近笔记卡片。
 */
export function RecentNoteCard({ note, authorName, authorImage }: RecentNoteCardProps): ReactElement {
  const navigate = useNavigate();
  return (
    <li className="min-w-0">
      <button
        type="button"
        className="group flex h-[190px] w-full flex-col overflow-hidden rounded-panel border border-border-row bg-surface text-left shadow-soft transition-[border-color,box-shadow,background-color] hover:border-border-button-hover hover:shadow-md active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
        onClick={() => navigate(routes.note(note._id))}
        aria-label={`打开笔记：${normalizeNoteTitle(note.title)}`}
      >
        <span aria-hidden="true" className="relative block h-8 w-full shrink-0 bg-[var(--workspace-paper)]">
          <span className="absolute right-1.5 top-1.5 size-6 rounded-bl-compact bg-[var(--workspace-fold)] [clip-path:polygon(0_0,100%_100%,0_100%)]" />
        </span>
        <span className="flex min-h-0 w-full flex-1 flex-col px-5 pb-4 pt-4">
          <span className="line-clamp-2 break-words text-[16px] font-medium leading-6 text-text-primary [overflow-wrap:anywhere]" title={normalizeNoteTitle(note.title)}>
            {normalizeNoteTitle(note.title)}
          </span>
          <span className="mt-auto flex items-center gap-2 pt-4 text-xs text-text-muted">
            <Image className="size-6 shrink-0 rounded-full object-cover" src={authorImage} defaultLink="/default.jpg" alt="" />
            <span className="min-w-0 flex-1 truncate">{authorName}</span>
            <span className="shrink-0">{formatNoteEditedTime(note)}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * 以相同卡片高度保持加载前后布局稳定。
 * @returns 最近笔记骨架。
 */
export function RecentNoteCardSkeleton(): ReactElement {
  return (
    <li aria-hidden="true" className="flex h-[190px] min-w-0 flex-col overflow-hidden rounded-panel border border-border-row bg-surface">
      <div className="h-8 bg-[var(--workspace-paper)]" />
      <div className="flex flex-1 flex-col p-5">
        <div className="h-4 w-3/4 animate-pulse rounded-compact bg-skeleton motion-reduce:animate-none" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded-compact bg-skeleton motion-reduce:animate-none" />
        <div className="mt-auto h-5 w-24 animate-pulse rounded-compact bg-skeleton motion-reduce:animate-none" />
      </div>
    </li>
  );
}
