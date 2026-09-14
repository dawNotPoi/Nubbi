import { useTracePlayback } from "./use-trace-playback.ts";
import { TraceTimeline, EmptyTrace } from "./trace-timeline.tsx";

import { runStatusText } from "./trace-format.ts";
import { buildTraceItems } from "./trace-events.ts";

import { Activity, Pause, Play, RotateCcw, StepBack, StepForward, X } from "lucide-react";

import { cn } from "../../lib/utils.ts";
import type { StreamEvent } from "../../types.ts";
import { Button } from "../../components/ui/button.tsx";

/**
 * dsh 风格运行轨迹侧边栏：展示当前 Run 的实时轨迹，或加载历史 Run 回放。
 * @param props.open 是否展开。
 * @param props.onClose 关闭回调。
 * @param props.conversationId 当前对话 ID，用于加载历史 Run。
 * @param props.liveEvents 当前 Run 的实时事件。
 * @param props.liveRunId 当前 Run ID。
 * @param props.generating 是否正在生成。
 * @returns 轨迹侧边栏视图。
 */
export const TraceDrawer = ({
  open,
  onClose,
  conversationId,
  liveEvents,
  liveRunId,
  liveText,
  generating,
}: {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
  liveEvents: StreamEvent[];
  liveRunId: string | null;
  liveText: string;
  generating: boolean;
}): React.JSX.Element => {
  const {
    runs,
    historyRuns,
    loading,
    error,
    replayMode,
    setReplayMode,
    replayIndex,
    setReplayIndex,
    replayPlaying,
    setReplayPlaying,
    liveTraceItems,
    allHistoryEvents,
  } = useTracePlayback({ open, conversationId, liveEvents, liveText });

  return (
    <div className={cn("fixed inset-0 z-50 transition", open ? "pointer-events-auto" : "pointer-events-none")}>
      <button
        aria-label="关闭运行轨迹"
        className={cn("absolute inset-0 bg-foreground/25 transition-opacity", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
        type="button"
      />
      <aside
        className={cn(
          "absolute inset-y-0 right-0 flex w-[min(92vw,420px)] flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
          <Activity className="size-5 text-primary" />
          <p className="min-w-0 flex-1 truncate font-semibold">运行轨迹</p>
          {liveEvents.length > 0 ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                generating ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600",
              )}
              title={liveRunId ?? undefined}
            >
              {generating ? "实时" : "最近一次"}
            </span>
          ) : null}
          {!liveEvents.length && historyRuns && historyRuns.length > 0 ? (
            <Button
              onClick={() => {
                setReplayMode((value) => !value);
                setReplayIndex(0);
                setReplayPlaying(false);
              }}
              className="h-8 px-2 text-xs"
              variant="outline"
            >
              {replayMode ? "退出回放" : "回放"}
            </Button>
          ) : null}
          <Button aria-label="关闭" onClick={onClose} size="icon" variant="ghost">
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {liveEvents.length > 0 ? (
            liveTraceItems.length ? (
              <TraceTimeline items={liveTraceItems} />
            ) : (
              <EmptyTrace />
            )
          ) : (
            <>
              {loading && !historyRuns ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">正在加载轨迹…</p>
              ) : null}
              {error ? <p className="px-4 py-3 text-sm text-red-600">{error}</p> : null}
              {!loading && !runs.length && !historyRuns ? <EmptyTrace /> : null}
              {replayMode && allHistoryEvents.length > 0 ? (
                <>
                  <div className="flex items-center gap-1 border-b px-3 py-2">
                    <Button
                      aria-label="上一步"
                      disabled={replayIndex === 0}
                      onClick={() => {
                        setReplayPlaying(false);
                        setReplayIndex((index) => Math.max(0, index - 1));
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <StepBack />
                    </Button>
                    <Button
                      aria-label={replayPlaying ? "暂停" : "播放"}
                      onClick={() => setReplayPlaying((value) => !value)}
                      size="icon"
                      variant="ghost"
                    >
                      {replayPlaying ? <Pause /> : <Play />}
                    </Button>
                    <Button
                      aria-label="下一步"
                      disabled={replayIndex >= allHistoryEvents.length}
                      onClick={() => {
                        setReplayPlaying(false);
                        setReplayIndex((index) => Math.min(allHistoryEvents.length, index + 1));
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <StepForward />
                    </Button>
                    <Button
                      aria-label="重置"
                      onClick={() => {
                        setReplayPlaying(false);
                        setReplayIndex(0);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <RotateCcw />
                    </Button>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {replayIndex}/{allHistoryEvents.length}
                    </span>
                  </div>
                  <TraceTimeline items={buildTraceItems(allHistoryEvents.slice(0, replayIndex))} />
                </>
              ) : (
                historyRuns?.map(({ summary, events }) => {
                  const items = buildTraceItems(events);
                  if (!items.length) return null;
                  return (
                    <section className="border-b last:border-b-0" key={summary.runId}>
                      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                        <span>{new Date(summary.startedAt).toLocaleString("zh-CN", { hour12: false })}</span>
                        <span>{runStatusText(summary.status)}</span>
                      </div>
                      <TraceTimeline items={items} />
                    </section>
                  );
                })
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
};
