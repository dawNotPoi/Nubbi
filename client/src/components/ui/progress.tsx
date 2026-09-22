import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
/**
 * 展示有确定百分比的任务进度。
 * @param props 进度百分比、说明和状态。
 * @returns 使用语义色的进度条。
 */
export function Progress({ value, label = "进度", error = false, className }: { value: number; label?: string; error?: boolean; className?: string }): ReactElement {
  const percent = Math.min(100, Math.max(0, value));
  return <div role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className={cn("h-1.5 overflow-hidden rounded-full bg-bg-selected", className)}><div className="h-full rounded-full transition-[width] motion-reduce:transition-none" style={{ width: `${percent}%`, background: error ? "var(--danger-text)" : "var(--brand)" }} /></div>;
}
