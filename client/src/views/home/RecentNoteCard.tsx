import { getNoteDetail, type Note } from "@/api/note";
import { useQuery } from "@tanstack/react-query";
import { noteKeys } from "@/features/note/model/keys";
import { useAuth } from "@/hooks/useAuth";
import clsx from "clsx";
import { noteExcerpt } from "./noteExcerpt";
import Image from "@/component/UI/Image";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { formatNoteEditedTime } from "@/features/note/model/library";
import { routes } from "@/utils/routes";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";

/** 当前账号笔记卡片所需的作者展示资料。 */
interface RecentNoteCardProps {
  note: Note;
  featured?: boolean;
  authorName: string;
  authorImage: string;
}

/**
 * 纸面卡片以标题和作者头像呈现内容，整卡支持键盘打开。
 * @param props 笔记与当前账号作者资料。
 * @returns 最近笔记卡片。
 */
export function RecentNoteCard({ note, authorName, authorImage, featured = false }: RecentNoteCardProps): ReactElement {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isPending, isError } = useQuery({
    queryKey: noteKeys.detail(user?.id || "", note._id),
    queryFn: async () => (await getNoteDetail(note._id)).data,
    enabled: Boolean(user?.id),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
  const excerpt = noteExcerpt(data?.content || "", note.title);

  return (
    <li className={clsx("min-w-0", featured && "@[780px]:col-span-2")}>
      <button
        type="button"
        className={clsx(
          "flex h-[210px] w-full flex-col overflow-hidden rounded-panel border border-border-row p-5 text-left transition-colors hover:border-border-button-hover hover:bg-bg-hover active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none",
          featured ? "border-l-[3px] border-l-[var(--workspace-primary)] bg-[var(--workspace-featured)]" : "bg-surface",
        )}
        onClick={() => navigate(routes.note(note._id))}
        aria-label={`打开笔记：${normalizeNoteTitle(note.title)}`}
      >
        <span className="flex min-h-0 w-full flex-1 flex-col">
          {featured ? <span className="mb-2 self-start rounded-compact bg-[var(--workspace-badge)] px-2 py-1 text-xs font-medium text-[var(--workspace-primary)]">继续编辑</span> : null}
          <span className={clsx("line-clamp-2 break-words font-medium leading-6 text-text-primary [overflow-wrap:anywhere]", featured ? "text-lg" : "text-base")} title={normalizeNoteTitle(note.title)}>
            {normalizeNoteTitle(note.title)}
          </span>
          <span className="mt-3 line-clamp-2 text-sm leading-6 text-text-muted [overflow-wrap:anywhere]">
            {isPending ? "正在读取内容…" : isError ? "打开笔记查看内容" : excerpt || "还没有正文，继续写下你的想法"}
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
 * @param props 是否为跨列主卡。
 * @returns 最近笔记骨架。
 */
export function RecentNoteCardSkeleton({ featured = false }: { featured?: boolean }): ReactElement {
  return (
    <li aria-hidden="true" className={clsx("flex h-[210px] min-w-0 flex-col overflow-hidden rounded-panel border border-border-row bg-surface", featured && "@[780px]:col-span-2")}>
      <div className="flex flex-1 flex-col p-5">
        <div className="h-4 w-3/4 animate-pulse rounded-compact bg-skeleton motion-reduce:animate-none" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded-compact bg-skeleton motion-reduce:animate-none" />
        <div className="mt-auto h-5 w-24 animate-pulse rounded-compact bg-skeleton motion-reduce:animate-none" />
      </div>
    </li>
  );
}
