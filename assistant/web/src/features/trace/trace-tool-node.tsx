import { TraceItem } from "./trace-types.ts";

import { CheckCircle2, ChevronDown, Clock3, Loader2, ShieldCheck, XCircle } from "lucide-react";

import { cn } from "../../lib/utils.ts";

/**
 * 展示 tool 轨迹节点。
 * @param props 节点数据。
 * @returns 对应视图。
 */
export const TraceToolNode = ({ item }: { item: Extract<TraceItem, { kind: "tool" }> }): React.JSX.Element => {
  const failed = item.status === "done" && item.success === false;
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
          item.status === "running"
            ? "bg-amber-500/10 text-amber-600"
            : failed
              ? "bg-red-500/10 text-red-600"
              : "bg-emerald-500/10 text-emerald-600",
        )}
      >
        {item.status === "running" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : failed ? (
          <XCircle className="size-3.5" />
        ) : (
          <CheckCircle2 className="size-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <details open>
          <summary className="cursor-pointer list-none text-sm font-medium">
            <span className="truncate">
              {item.server} / {item.tool}
            </span>
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
                <pre
                  className={cn(
                    "mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/60 p-2 text-[11px]",
                    failed ? "text-red-600" : "text-muted-foreground",
                  )}
                >
                  {item.result}
                </pre>
              </details>
            ) : null}
          </div>
        </details>
      </div>
    </div>
  );
};
/**
 * 展示 approval 轨迹节点。
 * @param props 节点数据。
 * @returns 对应视图。
 */
export const TraceApprovalNode = ({ item }: { item: Extract<TraceItem, { kind: "approval" }> }): React.JSX.Element => {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <ShieldCheck className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {item.approved === undefined ? "等待审批" : item.approved ? "已允许" : "已拒绝"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.server} / {item.tool}
        </p>
      </div>
    </div>
  );
};
