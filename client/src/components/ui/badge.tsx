import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib/utils";
/**
 * 显示简短的对象或状态标签。
 * @param props 标签内容与可选样式。
 * @returns 中性默认标签。
 */
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>): ReactElement {
  return <span {...props} className={cn("inline-flex items-center rounded-compact bg-bg-selected px-2 py-0.5 text-xs font-medium text-text-muted", className)} />;
}
