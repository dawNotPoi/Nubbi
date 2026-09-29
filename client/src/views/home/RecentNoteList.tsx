import { newNote } from "@/api/note";
import { Button } from "@/components/ui/button";
import {
  isAccountScopeCurrent,
  requireAccountScope,
} from "@/features/auth/model/account-scope";
import { useAuth } from "@/hooks/useAuth";
import { recentNoteAtom } from "@/store/atom/note/noteAtom";
import { createNoteAtom } from "@/store/atom/note/noteMutationAtom";
import { routes } from "@/utils/routes";
import { useAtomValue } from "jotai";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import CardWrapper from "./CardWrapper";
import { RecentNoteCard, RecentNoteCardSkeleton } from "./RecentNoteCard";

const CARD_SCROLL_STEP = 472;

/**
 * 展示最近笔记，并提供始终可见且可用键盘操作的横向浏览控件。
 * @param props 外层布局类名。
 * @returns 最近笔记区域。
 */
export default function RecentNoteList({ className }: { className?: string }): ReactElement {
  const { data = [], isPending, isFetching } = useAtomValue(recentNoteAtom);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mutate: createNote } = useAtomValue(createNoteAtom);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const hasNotes = data.length > 0;

  /** 根据真实滚动位置更新按钮状态，避免出现能点但没有响应的箭头。 */
  const syncScrollState = useCallback((): void => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setCanScrollLeft(viewport.scrollLeft > 1);
    setCanScrollRight(viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1);
  }, []);

  useEffect(() => {
    syncScrollState();
    window.addEventListener("resize", syncScrollState);
    return () => window.removeEventListener("resize", syncScrollState);
  }, [data.length, isPending, syncScrollState]);

  /** 新建成功后只在账号代次仍匹配时打开笔记，沿用首页原有权限语义。 */
  const handleCreateNote = (): void => {
    if (!user?.id) return;
    const scope = requireAccountScope();
    const note = newNote();
    createNote(
      { note },
      {
        onSuccess: () => {
          if (!isAccountScopeCurrent(scope)) return;
          navigate(routes.note(note._id));
        },
      },
    );
  };

  /** 按两张卡片的距离移动，仍允许触控板直接滚动。 */
  const scrollNotes = (direction: -1 | 1): void => {
    viewportRef.current?.scrollBy({ left: direction * CARD_SCROLL_STEP, behavior: "smooth" });
  };

  return (
    <CardWrapper
      className={className}
      header={
        <>
          <Clock className="size-[18px] text-text-muted" />
          <span>最近编辑</span>
          {isFetching && !isPending ? (
            <span className="ml-2 text-xs font-normal text-text-muted">更新中...</span>
          ) : null}
          {!isPending && hasNotes && (canScrollLeft || canScrollRight) ? (
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="向左查看更多最近编辑"
                disabled={!canScrollLeft}
                icon={<ChevronLeft />}
                onClick={() => scrollNotes(-1)}
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="向右查看更多最近编辑"
                disabled={!canScrollRight}
                icon={<ChevronRight />}
                onClick={() => scrollNotes(1)}
              />
            </div>
          ) : null}
        </>
      }
    >
      {isPending || hasNotes ? (
        <div
          ref={viewportRef}
          className="overflow-x-auto scroll-smooth pb-1 scrollbar-none"
          onScroll={syncScrollState}
        >
          <ul className="flex w-max snap-x snap-mandatory gap-3">
            {isPending
              ? Array.from({ length: 4 }, (_, index) => (
                  <RecentNoteCardSkeleton key={`recent-note-skeleton-${index}`} />
                ))
              : data.map((note) => <RecentNoteCard key={note._id} note={note} />)}
          </ul>
        </div>
      ) : (
        <div className="flex min-h-32 flex-col items-start justify-center rounded-panel border border-border-row bg-bg-panel px-5 py-5">
          <p className="text-sm font-medium text-text-primary">还没有笔记</p>
          <p className="mt-1 text-sm text-text-muted">写下第一篇，之后可从这里继续。</p>
          <Button
            className="mt-4"
            variant="outline"
            icon={<Plus />}
            onClick={handleCreateNote}
          >
            新建笔记
          </Button>
        </div>
      )}
    </CardWrapper>
  );
}
