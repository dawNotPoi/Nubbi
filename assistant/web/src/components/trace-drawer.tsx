import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Gauge,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  StepBack,
  StepForward,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getRunEvents, listConversationRuns } from "../api";
import { cn } from "../lib/utils";
import type {
  RunSummary,
  RuntimeEvent,
  StreamEvent,
} from "../types";
import { Button } from "./ui/button";

/** 轨迹时间线中的一条展示项。 */
type TraceItem =
  | {
      kind: "run";
      provider: "openai-compatible" | "codex-subscription";
      timestamp?: string;
    }
  | { kind: "reasoning"; text: string; timestamp?: string }
  | { kind: "text"; text: string; timestamp?: string }
  | { kind: "skill"; name: string; description: string; timestamp?: string }
  | {
      kind: "tool";
      id: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
      result?: string;
      success?: boolean;
      durationMs?: number;
      status: "running" | "done";
      timestamp?: string;
    }
  | {
      kind: "approval";
      id: string;
      server: string;
      tool: string;
      approved?: boolean;
      timestamp?: string;
    }
  | {
      kind: "token";
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      timestamp?: string;
    }
  | {
      kind: "end";
      status: "completed" | "failed" | "cancelled" | "abandoned";
      message?: string;
      timestamp?: string;
    }
  | { kind: "error"; message: string; timestamp?: string };

/**
 * 把原始运行事件折叠成适合侧边栏时间线展示的条目。
 * @param events 原始 SSE 或 Run 事件列表。
 * @returns 轨迹时间线条目。
 */
const buildTraceItems = (events: StreamEvent[]): TraceItem[] => {
  const items: TraceItem[] = [];

  const findTool = (event: Extract<StreamEvent, { type: "tool-start" | "tool-result" }>): number => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (item?.kind !== "tool") continue;
      if (event.callId !== undefined && item.id === event.callId) return index;
      if (event.callId === undefined && item.server === event.server && item.tool === event.tool) return index;
    }
    return -1;
  };

  const findApproval = (approvalId: string): number => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (item?.kind === "approval" && item.id === approvalId) return index;
    }
    return -1;
  };

  for (const event of events) {
    if (event.type === "run-started") {
      items.push({ kind: "run", provider: event.provider, timestamp: event.timestamp });
    } else if (event.type === "reasoning-delta") {
      const last = items.at(-1);
      if (last?.kind === "reasoning") {
        items[items.length - 1] = { ...last, text: last.text + event.text };
      } else {
        items.push({ kind: "reasoning", text: event.text, timestamp: event.timestamp });
      }
    } else if (event.type === "skill-active") {
      items.push({ kind: "skill", name: event.name, description: event.description, timestamp: event.timestamp });
    } else if (event.type === "tool-start") {
      const id = event.callId ?? `${event.server}/${event.tool}`;
      items.push({
        kind: "tool",
        id,
        server: event.server,
        tool: event.tool,
        arguments: event.arguments,
        status: "running",
        timestamp: event.timestamp,
      });
    } else if (event.type === "tool-result") {
      const index = findTool(event);
      if (index >= 0) {
        const current = items[index];
        if (current?.kind === "tool") {
          items[index] = {
            ...current,
            result: event.result,
            success: event.success,
            durationMs: event.durationMs,
            status: "done",
          };
        }
      } else {
        items.push({
          kind: "tool",
          id: event.callId ?? `${event.server}/${event.tool}`,
          server: event.server,
          tool: event.tool,
          arguments: {},
          result: event.result,
          success: event.success,
          durationMs: event.durationMs,
          status: "done",
          timestamp: event.timestamp,
        });
      }
    } else if (event.type === "approval-request") {
      items.push({
        kind: "approval",
        id: event.approvalId,
        server: event.server,
        tool: event.tool,
        timestamp: event.timestamp,
      });
    } else if (event.type === "approval-resolved") {
      const index = findApproval(event.approvalId);
      if (index >= 0) {
        const current = items[index];
        if (current?.kind === "approval") {
          items[index] = { ...current, approved: event.approved };
        }
      }
    } else if (event.type === "token-usage") {
      const last = items.at(-1);
      if (last?.kind === "token") {
        items[items.length - 1] = { ...last, ...event, kind: "token" };
      } else {
        items.push({
          kind: "token",
          promptTokens: event.promptTokens,
          completionTokens: event.completionTokens,
          totalTokens: event.totalTokens,
          timestamp: event.timestamp,
        });
      }
    } else if (event.type === "run-completed") {
      items.push({ kind: "end", status: "completed", timestamp: event.timestamp });
    } else if (event.type === "run-failed") {
      items.push({
        kind: "end",
        status: event.cancelled ? "cancelled" : "failed",
        message: event.message,
        timestamp: event.timestamp,
      });
    } else if (event.type === "run-abandoned") {
      items.push({ kind: "end", status: "abandoned", message: event.reason, timestamp: event.timestamp });
    } else if (event.type === "error") {
      items.push({ kind: "error", message: event.message, timestamp: event.timestamp });
    }
  }

  return items;
};

/**
 * 把 ISO 时间格式化为 HH:mm:ss。
 * @param value 可选 ISO 时间字符串。
 * @returns 格式化后的本地时间；无值时返回空字符串。
 */
const formatTime = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", { hour12: false });
};

/**
 * Run 状态的中文展示文本。
 * @param status Run 状态。
 * @returns 中文状态文案。
 */
const runStatusText = (status: RunSummary["status"]): string => ({
  running: "运行中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
  abandoned: "已中断",
})[status];

/**
 * 轨迹时间线单条节点。
 * @param props.item 轨迹条目。
 * @returns 时间线节点视图。
 */
const TraceNode = ({ item }: { item: TraceItem }) => {
  if (item.kind === "run") {
    return (
      <div className="flex gap-3">
        <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Bot className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">运行开始</p>
          <p className="text-xs text-muted-foreground">
            {item.provider === "codex-subscription" ? "ChatGPT 订阅" : "OpenAI 兼容"}
            {item.timestamp ? ` · ${formatTime(item.timestamp)}` : ""}
          </p>
        </div>
      </div>
    );
  }

  if (item.kind === "reasoning") {
    return (
      <div className="flex gap-3">
        <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600">
          <Sparkles className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <details>
            <summary className="cursor-pointer list-none text-sm font-medium">
              推理过程
              <ChevronDown className="ml-1 inline size-3.5 text-muted-foreground" />
            </summary>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-xs leading-5 text-muted-foreground">
              {item.text}
            </p>
          </details>
        </div>
      </div>
    );
  }

  if (item.kind === "text") {
    return (
      <div className="flex gap-3">
        <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-sky-500/10 text-sky-600">
          <FileText className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <details open>
            <summary className="cursor-pointer list-none text-sm font-medium">
              输出文本
              <ChevronDown className="ml-1 inline size-3.5 text-muted-foreground" />
            </summary>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-xs leading-5 text-muted-foreground">
              {item.text}
            </p>
          </details>
        </div>
      </div>
    );
  }

  if (item.kind === "skill") {
    return (
      <div className="flex gap-3">
        <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-600">
          <Sparkles className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{item.name}</p>
          {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
        </div>
      </div>
    );
  }

  if (item.kind === "tool") {
    const failed = item.status === "done" && item.success === false;
    return (
      <div className="flex gap-3">
        <div className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
          item.status === "running" ? "bg-amber-500/10 text-amber-600" : failed ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600",
        )}>
          {item.status === "running" ? <Loader2 className="size-3.5 animate-spin" /> : failed ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <details open>
            <summary className="cursor-pointer list-none text-sm font-medium">
              <span className="truncate">{item.server} / {item.tool}</span>
              {item.status === "running" ? (
                <span className="ml-2 text-xs text-amber-600">执行中</span>
              ) : item.durationMs !== undefined ? (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3" />
                  {item.durationMs < 1000 ? `${item.durationMs}ms` : `${(item.durationMs / 1000).toFixed(1)}s`}
                </span>
              ) : null}
              <ChevronDown className="ml-1 inline size-3.5 text-muted-foreground" />
            </summary>
            <div className="mt-1 space-y-1.5">
              <details open>
                <summary className="cursor-pointer list-none text-xs text-muted-foreground">参数</summary>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/60 p-2 text-[11px] text-muted-foreground">
                  {JSON.stringify(item.arguments, null, 2)}
                </pre>
              </details>
              {item.result !== undefined ? (
                <details open>
                  <summary className="cursor-pointer list-none text-xs text-muted-foreground">结果</summary>
                  <pre className={cn(
                    "mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/60 p-2 text-[11px]",
                    failed ? "text-red-600" : "text-muted-foreground",
                  )}>
                    {item.result}
                  </pre>
                </details>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    );
  }

  if (item.kind === "approval") {
    return (
      <div className="flex gap-3">
        <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {item.approved === undefined ? "等待审批" : item.approved ? "已允许" : "已拒绝"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{item.server} / {item.tool}</p>
        </div>
      </div>
    );
  }

  if (item.kind === "token") {
    return (
      <div className="flex gap-3">
        <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-sky-500/10 text-sky-600">
          <Gauge className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Token 用量</p>
          <p className="text-xs text-muted-foreground">
            Prompt {item.promptTokens} · 输出 {item.completionTokens} · 合计 {item.totalTokens}
          </p>
        </div>
      </div>
    );
  }

  if (item.kind === "end") {
    const failed = item.status === "failed" || item.status === "abandoned";
    return (
      <div className="flex gap-3">
        <div className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
          failed ? "bg-red-500/10 text-red-600" : item.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-600",
        )}>
          {failed ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {item.status === "completed" ? "运行完成" : item.status === "failed" ? "运行失败" : item.status === "cancelled" ? "已取消" : "已中断"}
          </p>
          {item.message ? <p className="text-xs text-muted-foreground">{item.message}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-600">
        <XCircle className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">错误</p>
        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{item.message}</p>
      </div>
    </div>
  );
};

/**
 * 轨迹时间线列表。
 * @param props.items 轨迹条目。
 * @returns 时间线视图。
 */
const TraceTimeline = ({ items }: { items: TraceItem[] }) => (
  <div className="space-y-5 px-4 py-4">
    {items.map((item, index) => (
      <div className="relative pl-1" key={index}>
        {index < items.length - 1 ? (
          <span className="absolute left-[11px] top-7 bottom-[-14px] w-px bg-border" />
        ) : null}
        <TraceNode item={item} />
      </div>
    ))}
  </div>
);

/**
 * 空轨迹占位视图。
 * @returns 空状态提示。
 */
const EmptyTrace = () => (
  <div className="grid flex-1 place-items-center px-6 py-10">
    <div className="text-center">
      <Activity className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">暂无轨迹数据</p>
    </div>
  </div>
);

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
}) => {
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
        const loaded = await Promise.all(ordered.map(async (summary) => {
          try {
            const events = await getRunEvents(summary.runId);
            return { summary, events };
          } catch {
            return { summary, events: [] };
          }
        }));
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
  const allHistoryEvents = useMemo(
    () => historyRuns?.flatMap((run) => run.events) ?? [],
    [historyRuns],
  );

  useEffect(() => {
    if (!replayPlaying || replayIndex >= allHistoryEvents.length) {
      if (replayIndex >= allHistoryEvents.length) setReplayPlaying(false);
      return;
    }
    const timer = setTimeout(() => setReplayIndex((index) => index + 1), 600);
    return () => clearTimeout(timer);
  }, [allHistoryEvents.length, replayIndex, replayPlaying]);

  return (
    <div className={cn("fixed inset-0 z-50 transition", open ? "pointer-events-auto" : "pointer-events-none")}>
      <button
        aria-label="关闭运行轨迹"
        className={cn(
          "absolute inset-0 bg-foreground/25 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        type="button"
      />
      <aside className={cn(
        "absolute inset-y-0 right-0 flex w-[min(92vw,420px)] flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-xl transition-transform",
        open ? "translate-x-0" : "translate-x-full",
      )}>
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
            liveTraceItems.length ? <TraceTimeline items={liveTraceItems} /> : <EmptyTrace />
          ) : (
            <>
              {loading && !historyRuns ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">正在加载轨迹…</p>
              ) : null}
              {error ? (
                <p className="px-4 py-3 text-sm text-red-600">{error}</p>
              ) : null}
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
                        <span>
                          {new Date(summary.startedAt).toLocaleString("zh-CN", { hour12: false })}
                        </span>
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
