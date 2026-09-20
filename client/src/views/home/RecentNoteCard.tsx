import type { Note } from "@/api/note";
import Image from "@/component/UI/Image";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { formatNoteEditedTime } from "@/features/note/model/library";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function RecentNoteCard({
  avatarSrc,
  note,
}: {
  avatarSrc?: string;
  note: Note;
}) {
  const navigate = useNavigate();

  return (
    <li
      className="flex min-h-[156px] w-[176px] min-w-[176px] max-w-[176px] snap-start cursor-pointer flex-col overflow-hidden rounded-panel border border-border-row bg-surface shadow-[0_2px_10px_rgba(55,53,47,0.04)] transition-[border-color,background-color,box-shadow] hover:border-border-button-hover hover:bg-bg-hover hover:shadow-[0_5px_18px_rgba(55,53,47,0.07)] focus-within:ring-2 focus-within:ring-focus-ring"
      onClick={() => navigate(`/note/${note._id}`)}
    >
      <header className="relative mb-3">
        <div className="h-10 bg-[var(--entity-note-soft)]" />
        <div className="absolute bottom-0 left-4 grid size-7 translate-y-3 place-items-center rounded-compact border border-border-row bg-surface text-[var(--entity-note)] shadow-[0_1px_4px_rgba(55,53,47,0.06)]">
          <FileText className="size-4" strokeWidth={1.9} />
        </div>
      </header>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <div
          className="h-10 overflow-hidden break-words text-[14px] font-medium leading-5 text-text-primary [overflow-wrap:anywhere]"
          style={{
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            display: "-webkit-box",
          }}
          title={note.title || "未命名笔记"}
        >
          {normalizeNoteTitle(note.title)}
        </div>
        <section className="mt-auto flex items-center gap-1.5 pt-3 text-[12px] text-text-muted">
          <Image
            alt="user avatar"
            className="size-5 shrink-0 rounded-full border border-border-row bg-bg-hover object-cover"
            src={avatarSrc}
          />
          <span className="truncate">{formatNoteEditedTime(note)}</span>
        </section>
      </div>
    </li>
  );
}

export function RecentNoteCardSkeleton() {
  return (
    <li className="flex min-h-[156px] w-[176px] min-w-[176px] max-w-[176px] snap-start flex-col overflow-hidden rounded-panel border border-border-row bg-surface">
      <header className="relative mb-3">
        <div className="h-10 animate-pulse bg-[var(--entity-note-soft)]" />
        <div className="absolute bottom-0 left-4 size-7 translate-y-3 rounded-compact bg-skeleton" />
      </header>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <div className="space-y-2">
          <div className="h-4 animate-pulse rounded-compact bg-skeleton" />
          <div className="h-4 w-4/5 animate-pulse rounded-compact bg-skeleton" />
        </div>
        <div className="mt-auto flex items-center gap-2 pt-3">
          <div className="size-5 animate-pulse rounded-full bg-skeleton" />
          <div className="h-3 w-20 animate-pulse rounded-compact bg-skeleton" />
        </div>
      </div>
    </li>
  );
}
