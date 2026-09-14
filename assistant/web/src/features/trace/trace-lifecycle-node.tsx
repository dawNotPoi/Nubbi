import { formatTime } from "./trace-format.ts";

import { TraceItem } from "./trace-types.ts";

import { Bot, CheckCircle2, Gauge, XCircle } from "lucide-react";

import { cn } from "../../lib/utils.ts";

/**
 * 展示 run 轨迹节点。
 * @param props 节点数据。
 * @returns 对应视图。
 */
export const TraceRunNode = ({ item }: { item: Extract<TraceItem, { kind: "run" }> }): React.JSX.Element => {
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
};
/**
 * 展示 token 轨迹节点。
 * @param props 节点数据。
 * @returns 对应视图。
 */
export const TraceTokenNode = ({ item }: { item: Extract<TraceItem, { kind: "token" }> }): React.JSX.Element => {
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
};
/**
 * 展示 end 轨迹节点。
 * @param props 节点数据。
 * @returns 对应视图。
 */
export const TraceEndNode = ({ item }: { item: Extract<TraceItem, { kind: "end" }> }): React.JSX.Element => {
  const failed = item.status === "failed" || item.status === "abandoned";
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
          failed
            ? "bg-red-500/10 text-red-600"
            : item.status === "cancelled"
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-500/10 text-emerald-600",
        )}
      >
        {failed ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {item.status === "completed"
            ? "运行完成"
            : item.status === "failed"
              ? "运行失败"
              : item.status === "cancelled"
                ? "已取消"
                : "已中断"}
        </p>
        {item.message ? <p className="text-xs text-muted-foreground">{item.message}</p> : null}
      </div>
    </div>
  );
};
