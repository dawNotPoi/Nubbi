import { useAuth } from "@/hooks/useAuth";
import { recentNoteAtom } from "@/store/atom/noteAtom";
import { useAtomValue } from "jotai";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CardWrapper from "./CardWrapper";
import { RecentNoteCard, RecentNoteCardSkeleton } from "./RecentNoteCard";

const AVATAR_CACHE_KEY = "home_recent_note_user_avatar";
const NAME_CACHE_KEY = "home_recent_note_user_name";

const RecentNoteList: React.FC<{ className?: string }> = ({ className }) => {
  const {
    data = [],
    isPending,
    isFetching,
  } = useAtomValue(recentNoteAtom);
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const [cachedAvatar, setCachedAvatar] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const hasNotes = data.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const avatar = user?.image || localStorage.getItem(AVATAR_CACHE_KEY) || "";
    setCachedAvatar(avatar);

    if (user?.image) {
      localStorage.setItem(AVATAR_CACHE_KEY, user.image);
    }

    if (user?.name) {
      localStorage.setItem(NAME_CACHE_KEY, user.name);
    }
  }, [user?.image, user?.name]);

  useEffect(() => {
    const updateMax = () => {
      if (!wrapperRef.current || !listRef.current || !hasNotes) {
        setMaxOffset(0);
        setOffset(0);
        return;
      }

      const listWidth = listRef.current.scrollWidth;
      const wrapperWidth = wrapperRef.current.offsetWidth;
      const max = Math.max(listWidth - wrapperWidth, 0);
      setMaxOffset(max);
    };

    updateMax();
    window.addEventListener("resize", updateMax);
    return () => window.removeEventListener("resize", updateMax);
  }, [hasNotes, data]);

  const canScrollLeft = hasNotes && offset > 0;
  const canScrollRight = hasNotes && offset < maxOffset;

  return (
    <CardWrapper
      className={className}
      header={
        <>
          <Clock />
          <span>最近编辑</span>
          {isFetching && !isPending ? (
            <span className="ml-2 text-xs text-zinc-400">更新中...</span>
          ) : null}
        </>
      }
    >
      <div ref={wrapperRef} className="group relative -mx-2 overflow-hidden px-2 py-1">
        <ul
          ref={listRef}
          style={
            isPending
              ? undefined
              : {
                  transform: `translateX(-${offset}px)`,
                  transition: "all 0.3s",
                }
          }
          className="left-0 flex gap-4"
        >
          {isPending ? (
            Array.from({ length: 4 }).map((_, index) => (
              <RecentNoteCardSkeleton key={`recent-note-skeleton-${index}`} />
            ))
          ) : hasNotes ? (
            data.map((note) => (
              <RecentNoteCard
                avatarSrc={cachedAvatar || user?.image || ""}
                key={note._id}
                note={note}
              />
            ))
          ) : (
            <div className="text-gray-400 h-[100px]">暂无笔记</div>
          )}
        </ul>

        {!isPending && canScrollLeft && (
          <div className="z-20 h-full absolute left-0 top-0 bg-gradient-to-r from-white to-white/5 flex flex-col justify-center">
            <button
              onClick={() => {
                setOffset((v) => (v - 450 <= 0 ? 0 : v - 450));
              }}
              className="cursor-pointer group-hover:opacity-100 hover:border-sky-400 opacity-0 p-2 rounded-full bg-white border flex items-center justify-center"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        )}
        {!isPending && canScrollRight && (
          <div className="z-20 h-full absolute right-0 top-0 bg-gradient-to-l from-white to-white/5 flex flex-col justify-center">
            <button
              onClick={() => {
                setOffset((v) => (v + 450 > maxOffset ? maxOffset : v + 450));
              }}
              className="cursor-pointer group-hover:opacity-100 opacity-0 p-2 rounded-full bg-white border flex items-center justify-center hover:border-sky-400"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </CardWrapper>
  );
};

export default RecentNoteList;
