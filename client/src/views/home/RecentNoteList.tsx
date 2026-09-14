import { useAuth } from "@/hooks/useAuth";
import { recentNoteAtom } from "@/store/atom/noteAtom";
import { useAtomValue } from "jotai";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CardWrapper from "./CardWrapper";
import { RecentNoteCard, RecentNoteCardSkeleton } from "./RecentNoteCard";

const AVATAR_CACHE_KEY = "home_recent_note_user_avatar";
const NAME_CACHE_KEY = "home_recent_note_user_name";
const EDGE_FADE_MIN_WIDTH = 64;
const FALLBACK_CARD_STEP = 184;

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
  const [rightFadeWidth, setRightFadeWidth] = useState(EDGE_FADE_MIN_WIDTH);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const hasNotes = data.length > 0;

  const getListLayout = useCallback(() => {
    const wrapper = wrapperRef.current;
    const list = listRef.current;
    const firstCard = list?.querySelector("li");

    if (!wrapper || !list || !(firstCard instanceof HTMLElement)) return null;

    const { columnGap } = window.getComputedStyle(list);
    const gap = Number.parseFloat(columnGap) || 0;
    const cardWidth = firstCard.offsetWidth;
    const step = cardWidth + gap;

    if (cardWidth <= 0 || step <= 0) return null;

    const listLeft = list.offsetLeft;
    const availableWidth = Math.max(
      cardWidth,
      wrapper.clientWidth - listLeft - EDGE_FADE_MIN_WIDTH,
    );
    const visibleCardCount = Math.max(
      1,
      Math.floor((availableWidth + gap) / step),
    );
    const visibleCardsWidth =
      visibleCardCount * cardWidth + Math.max(visibleCardCount - 1, 0) * gap;
    const fadeWidth = Math.max(
      EDGE_FADE_MIN_WIDTH,
      wrapper.clientWidth - listLeft - visibleCardsWidth,
    );

    return {
      fadeWidth,
      step,
      visibleCardCount,
    };
  }, []);

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
      const layout = getListLayout();

      if (!layout || !hasNotes) {
        setMaxOffset(0);
        setOffset(0);
        setRightFadeWidth(EDGE_FADE_MIN_WIDTH);
        return;
      }

      const maxStartIndex = Math.max(data.length - layout.visibleCardCount, 0);
      const max = maxStartIndex * layout.step;
      setMaxOffset(max);
      setRightFadeWidth(layout.fadeWidth);
      setOffset((current) => Math.min(current, max));
    };

    updateMax();
    window.addEventListener("resize", updateMax);
    return () => window.removeEventListener("resize", updateMax);
  }, [data.length, getListLayout, hasNotes]);

  const canScrollLeft = hasNotes && offset > 0;
  const canScrollRight = hasNotes && offset < maxOffset;
  const hasHorizontalOverflow = hasNotes && maxOffset > 0;

  const scrollNotes = (direction: -1 | 1) => {
    const layout = getListLayout();
    const step = layout?.step || FALLBACK_CARD_STEP;
    const visibleCardCount = layout?.visibleCardCount || 1;
    const cardCountPerMove = Math.max(1, visibleCardCount - 1);
    const distance = cardCountPerMove * step;

    setOffset((current) => {
      const next = current + direction * distance;
      return Math.min(Math.max(next, 0), maxOffset);
    });
  };

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
          <div className="pointer-events-none absolute left-0 top-0 z-20 flex h-full w-16 flex-col items-start justify-center bg-gradient-to-r from-white to-white/5">
            <button
              onClick={() => {
                scrollNotes(-1);
              }}
              aria-label="向左查看更多最近编辑"
              className="pointer-events-auto flex cursor-pointer items-center justify-center rounded-full border bg-white p-2 opacity-0 hover:border-sky-400 group-hover:opacity-100"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        )}
        {!isPending && hasHorizontalOverflow && (
          <div
            className="pointer-events-none absolute right-0 top-0 z-20 flex h-full flex-col items-end justify-center bg-gradient-to-l from-white to-white/5"
            style={{ width: rightFadeWidth }}
          >
            {canScrollRight ? (
              <button
                onClick={() => {
                  scrollNotes(1);
                }}
                aria-label="向右查看更多最近编辑"
                className="pointer-events-auto flex cursor-pointer items-center justify-center rounded-full border bg-white p-2 opacity-0 hover:border-sky-400 group-hover:opacity-100"
              >
                <ChevronRight size={14} />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </CardWrapper>
  );
};

export default RecentNoteList;
