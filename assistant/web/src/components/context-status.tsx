import { Gauge } from "lucide-react";
import { cn } from "../lib/utils";

/** 把 token 数格式化为可读文本，如 12800 → 12.8k。 */
const formatTokens = (value: number): string => {
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
};

/**
 * 上下文占用状态：以图标和文字展示模型消耗量、容量比例与是否已自动压缩。
 * @param props.usedTokens 已用 token 数。
 * @param props.maxTokens 上下文容量（token）。
 * @param props.truncated 是否已发生上下文压缩。
 * @returns 状态视图。
 */
export const ContextStatus = ({
  usedTokens,
  maxTokens,
  truncated,
}: {
  usedTokens: number;
  maxTokens: number;
  truncated: boolean;
}) => {
  const percent = maxTokens > 0
    ? Math.min(100, Math.round((usedTokens / maxTokens) * 100))
    : 0;
  // 图标颜色随占用程度变化，替代进度条传达压力状态。
  const levelColor = percent >= 90
    ? "text-red-500"
    : percent >= 70
      ? "text-amber-500"
      : "text-emerald-500";
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      <Gauge className={cn("size-3.5 shrink-0", levelColor)} />
      <span className="truncate">
        上下文 {percent}% · {formatTokens(usedTokens)}/{formatTokens(maxTokens)}
        {truncated ? " · 已压缩" : ""}
      </span>
    </div>
  );
};
