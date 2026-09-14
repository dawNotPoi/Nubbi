import type { TracePlaybackState } from "./use-trace-playback-state.ts";
import { buildTraceItems } from "./trace-events.ts";

import { useEffect, useMemo, useState } from "react";
import { getRunEvents, listConversationRuns } from "../../platform/assistant-api.ts";

import type { RunSummary, RuntimeEvent, StreamEvent } from "../../types.ts";

/**
 * 加载轨迹并管理回放进度。
 * @param input 展开状态、对话及实时内容。
 * @returns 回放状态和控制函数。
 */
export function useTracePlayback({
  open,
  conversationId,
  liveEvents,
  liveText,
}: {
  open: boolean;
  conversationId?: string;
  liveEvents: StreamEvent[];
  liveText: string;
}): TracePlaybackState {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [historyRuns, setHistoryRuns] = useState<Array<{ summary: RunSummary; events: RuntimeEvent[] }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);

  // 有实时事件时优先展示当前 Run，不加载历史列表。
  useEffect(() => {
    if (!open) return;
    if (liveEvents.length > 0) {
      setHistoryRuns(null);
      setError(null);
    }
  }, [liveEvents.length, open]);

  // 没有实时事件时，加载当前对话的全部历史 Run 和各自事件，按时间正序展示整条链路。
  useEffect(() => {
    if (!open || liveEvents.length > 0) return;
    if (!conversationId) {
      setRuns([]);
      setHistoryRuns(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listConversationRuns(conversationId)
      .then(async (items) => {
        if (cancelled) return;
        setRuns(items);
        // 列表默认最新在前，这里反转为最早在前，便于展示整条对话链路。
        const ordered = [...items].reverse();
        const loaded = await Promise.all(
          ordered.map(async (summary) => {
            try {
              const events = await getRunEvents(summary.runId);
              return { summary, events };
            } catch {
              return { summary, events: [] };
            }
          }),
        );
        if (!cancelled) setHistoryRuns(loaded);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "加载轨迹失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, liveEvents.length, open]);

  const liveTraceItems = useMemo(() => {
    const items = buildTraceItems(liveEvents);
    return liveText ? [...items, { kind: "text" as const, text: liveText }] : items;
  }, [liveEvents, liveText]);

  // 历史回放：把全部 Run 的事件按时间正序合并成一条可逐步播放的链路。
  const allHistoryEvents = useMemo(() => historyRuns?.flatMap((run) => run.events) ?? [], [historyRuns]);

  useEffect(() => {
    if (!replayPlaying || replayIndex >= allHistoryEvents.length) {
      if (replayIndex >= allHistoryEvents.length) setReplayPlaying(false);
      return;
    }
    const timer = setTimeout(() => setReplayIndex((index) => index + 1), 600);
    return () => clearTimeout(timer);
  }, [allHistoryEvents.length, replayIndex, replayPlaying]);

  return {
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
  };
}
