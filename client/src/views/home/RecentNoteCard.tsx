import type { Note } from "@/api/note";
import Image from "@/component/UI/Image";
import clsx from "clsx";
import dayjs from "dayjs";
import { Notebook } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TITLE_LIMIT = 34;

const getDisplayTitle = (title?: string) => {
  const value = title?.trim();
  if (!value) return "未命名笔记";
  return value.length > TITLE_LIMIT ? `${value.slice(0, TITLE_LIMIT)}...` : value;
};

export function RecentNoteCard({
  avatarSrc,
  note,
}: {
  avatarSrc?: string;
  note: Note;
}) {
  const navigate = useNavigate();
  const displayTitle = getDisplayTitle(note.title);

  return (
    <li
      className="flex min-h-[164px] min-w-[168px] max-w-[168px] cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-sky-400"
      onClick={() => {
        navigate("/note/" + note._id);
      }}
    >
      <header className="relative mb-4">
        <div className="h-11 bg-slate-50" />
        <div className="absolute bottom-0 flex size-7 translate-x-5 translate-y-3 items-center justify-center overflow-hidden rounded-md bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
          <Notebook className="size-4" />
        </div>
      </header>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <div
          className={clsx(
            "h-10 overflow-hidden break-words text-[14px] font-medium leading-5 text-slate-800 [overflow-wrap:anywhere]",
            !note.title && "text-zinc-500",
          )}
          style={{
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            display: "-webkit-box",
          }}
          title={note.title || "未命名笔记"}
        >
          {displayTitle}
        </div>
        <section className="mt-auto flex items-center gap-1.5 pt-3 text-[13px] text-gray-500">
          <Image
            alt="user avatar"
            className="size-5 shrink-0 rounded-full border border-slate-200 bg-slate-100 object-cover"
            src={avatarSrc}
          />
          <span className="truncate">{dayjs(note.updatedAt).format("YYYY-MM-DD")}</span>
        </section>
      </div>
    </li>
  );
}

export function RecentNoteCardSkeleton() {
  return (
    <li className="flex min-h-[164px] min-w-[168px] max-w-[168px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="relative mb-4">
        <div className="h-11 animate-pulse bg-slate-100" />
        <div className="absolute bottom-0 size-7 translate-x-5 translate-y-3 rounded-md bg-slate-200" />
      </header>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <div className="space-y-2">
          <div className="h-4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="mt-auto flex items-center gap-2 pt-3">
          <div className="size-5 animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </li>
  );
}
