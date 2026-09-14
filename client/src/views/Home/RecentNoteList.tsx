import { Post } from "@/api/post";
import { recentPostAtom } from "@/store/atom/postAtom";
import clsx from "clsx";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { ChevronLeft, ChevronRight, Clock, Notebook } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CardWrapper from "./CardWrapper";

const NoteCard = ({ post }: { post: Post }) => {
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
        <div className="absolute bottom-0 rounded-md overflow-hidden translate-x-6 translate-y-[14px]  size-[25px] ">
          <Notebook />
        </div>
      </header>
      <div className="pt-[10px] px-4 flex-1 pb-[14px]">
        <header>
          <div
            className={clsx(
              "text-[14px] h-[60px]",
              !post.title && "text-zinc-500"
            )}
          >
            {post.title || "未命名文章"}
          </div>
          <section className="text-[13px] text-gray-500 flex gap-1 items-center">
            <div className="rounded-full inline-block size-fit px-1 border-2 ">
              未
            </div>
            {dayjs(post.updatedAt).format("YYYY-MM-DD")}
          </section>
        </header>
      </div>
    </li>
  );
};

const RecentNoteList: React.FC<{ className?: string }> = ({ className }) => {
  const { data } = useAtomValue(recentPostAtom);
  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  let wrapperRef = useRef<HTMLDivElement>(null);
  let ListRef = useRef<HTMLUListElement>(null);
  const hasNotes = !!data?.length;

  //更新最大宽度
  useEffect(() => {
    const updateMax = () => {
      if (!wrapperRef.current || !ListRef.current || !hasNotes) {
        setMaxOffset(0);
        setOffset(0);
        return;
      }
      const listwidth = ListRef.current.scrollWidth;
      const wrapperwidth = wrapperRef.current.offsetWidth;
      const max = Math.max(listwidth - wrapperwidth, 0);
      setMaxOffset(max);
    };
    updateMax();
    window.addEventListener("resize", updateMax);
    return () => window.removeEventListener("resize", updateMax);
  }, [hasNotes, data]);

  const canScrollLeft = hasNotes && offset > 0;
  const canScrollRight = hasNotes && offset < maxOffset;

  if (!data) return null;
  return (
    <CardWrapper
      className={className}
      header={
        <>
          <Clock />
          <span>最近编辑</span>
        </>
      }
    >
      <div ref={wrapperRef} className="overflow-hidden group relative  ">
        <ul
          ref={ListRef}
          style={{
            transform: `translateX(-${offset}px)`,
            transition: "all 0.3s",
          }}
          className=" gap-4 flex  left-0"
        >
          {data?.length > 0 ? (
            data.map((post) => <NoteCard post={post} key={post._id} />)
          ) : (
            <div className="text-gray-400 h-[100px]">暂无文章</div>
          )}
        </ul>

        {canScrollLeft && (
          <div className="z-20 h-full  absolute left-0 top-0 bg-gradient-to-r from-white to-white/5  flex flex-col justify-center">
            <button
              onClick={() => {
                setOffset((v) => (v - 450 <= 0 ? 0 : v - 450));
              }}
              className="cursor-pointer group-hover:opacity-100 hover:border-sky-400  opacity-0  p-2 rounded-full bg-white border flex items-center justify-center"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        )}
        {canScrollRight && (
          <div className="z-20 h-full absolute right-0 top-0 bg-gradient-to-l from-white to-white/5  flex flex-col justify-center">
            <button
              onClick={() => {
                setOffset((v) => (v + 450 > maxOffset ? maxOffset : v + 450));
              }}
              className="cursor-pointer  group-hover:opacity-100  opacity-0  p-2 rounded-full bg-white border flex items-center justify-center hover:border-sky-400 "
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
