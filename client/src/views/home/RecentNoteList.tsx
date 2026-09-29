import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { recentNoteAtom } from "@/store/atom/note/noteAtom";
import { routes } from "@/utils/routes";
import { useAtomValue } from "jotai";
import { ArrowRight, RefreshCw } from "lucide-react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { RecentNoteCard, RecentNoteCardSkeleton } from "./RecentNoteCard";

/**
 * 将当前账号的最近内容排为书架，保留加载、失败和空状态。
 * @param props 外层布局类名。
 * @returns 最近编辑区域。
 */
export default function RecentNoteList({ className }: { className?: string }): ReactElement {
  const { data = [], isPending, isError, isFetching, refetch } = useAtomValue(recentNoteAtom);
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <section className={`@container ${className || ""}`} aria-labelledby="recent-notes-title">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="recent-notes-title" className="text-lg font-semibold">最近编辑</h2>
        <Button variant="ghost" onClick={() => navigate(routes.noteLib)} className="text-[var(--workspace-primary)]">
          查看全部 <ArrowRight />
        </Button>
      </div>
      {isError ? (
        <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-panel border border-border-row px-4 py-3 text-sm text-text-muted">
          <span>{data.length ? "最近内容更新失败，仍显示上次内容。" : "暂时无法加载最近笔记。"}</span>
          <Button variant="ghost" icon={<RefreshCw />} loading={isFetching} onClick={() => void refetch()}>重试</Button>
        </div>
      ) : null}
      {isPending || data.length > 0 ? (
        <ul className="grid grid-cols-1 gap-5 @[440px]:grid-cols-2 @[780px]:grid-cols-3" aria-busy={isPending}>
          {isPending
            ? Array.from({ length: 5 }, (_, index) => <RecentNoteCardSkeleton key={index} featured={index === 0} />)
            : data.slice(0, 5).map((note, index) => <RecentNoteCard featured={index === 0} key={note._id} note={note} authorName={user?.name || "我"} authorImage={user?.image || ""} />)}
        </ul>
      ) : !isError ? (
        <div className="rounded-panel border border-dashed border-border-button bg-bg-panel px-6 py-10">
          <p className="text-sm font-medium">从一个想法开始</p>
          <p className="mt-2 text-sm text-text-muted">点击上方「新建笔记」，写下你的第一篇内容。</p>
        </div>
      ) : null}
    </section>
  );
}
