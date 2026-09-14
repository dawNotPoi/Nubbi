import { Post } from "@/api/post";
import Image from "@/component/UI/Image";
import { useAuth } from "@/hooks/useAuth";
import { recentPostAtom } from "@/store/atom/postAtom";
import clsx from "clsx";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { ChevronLeft, ChevronRight, Clock, Notebook } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CardWrapper from "./CardWrapper";

const AVATAR_CACHE_KEY = "home_recent_note_user_avatar";
const NAME_CACHE_KEY = "home_recent_note_user_name";

const NoteCard = ({
  post,
  avatarSrc,
}: {
  post: Post;
  avatarSrc?: string;
}) => {
  const navigate = useNavigate();

  return (
    <li
      onClick={() => {
        navigate("/note/" + post._id);
      }}
      className="min-w-[150px] max-w-[150px] cursor-pointer hover:border-sky-400 flex flex-col overflow-hidden border rounded-xl"
    >
      <header className="relative mb-[16px]">
        <div className="h-[40px] bg-slate-50"></div>
        <div className="absolute bottom-0 rounded-md overflow-hidden translate-x-6 translate-y-[14px] size-[25px]">
          <Notebook />
        </div>
      </header>
      <div className="pt-[10px] px-4 flex-1 pb-[14px]">
        <header>
          <div
            className={clsx(
              "text-[14px] h-[60px]",
              !post.title && "text-zinc-500",
            )}
          >
            {post.title || "未命名文章"}
          </div>
          <section className="text-[13px] text-gray-500 flex gap-1 items-center">
            <Image
              src={avatarSrc}
              alt="user avatar"
              className="size-5 rounded-full border border-slate-200 bg-slate-100 object-cover"
            />
            <span>{dayjs(post.updatedAt).format("YYYY-MM-DD")}</span>
          </section>
        </header>
      </div>
    </li>
  );
};

const NoteCardSkeleton = () => {
  return (
    <li className="min-w-[150px] max-w-[150px] flex flex-col overflow-hidden border rounded-xl animate-pulse">
      <header className="relative mb-[16px]">
        <div className="h-[40px] bg-slate-100"></div>
        <div className="absolute bottom-0 translate-x-6 translate-y-[14px] size-[25px] rounded-md bg-slate-200"></div>
      </header>
      <div className="pt-[10px] px-4 flex-1 pb-[14px]">
        <div className="space-y-2">
          <div className="h-4 rounded bg-slate-200"></div>
          <div className="h-4 w-4/5 rounded bg-slate-200"></div>
          <div className="h-4 w-3/5 rounded bg-slate-200"></div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="size-5 rounded-full bg-slate-200"></div>
          <div className="h-3 w-20 rounded bg-slate-200"></div>
        </div>
      </div>
    </li>
  );
};

const RecentNoteList: React.FC<{ className?: string }> = ({ className }) => {
  const {
    data = [],
    isPending,
    isFetching,
  } = useAtomValue(recentPostAtom);
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
      <div ref={wrapperRef} className="overflow-hidden group relative">
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
          className="gap-4 flex left-0"
        >
          {isPending ? (
            Array.from({ length: 4 }).map((_, index) => (
              <NoteCardSkeleton key={`recent-note-skeleton-${index}`} />
            ))
          ) : hasNotes ? (
            data.map((post) => (
              <NoteCard
                key={post._id}
                post={post}
                avatarSrc={cachedAvatar || user?.image || ""}
              />
            ))
          ) : (
            <div className="text-gray-400 h-[100px]">暂无文章</div>
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
