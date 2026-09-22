import { LoaderCircle } from "lucide-react";
import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
/**
 * 显示有可访问名称的加载状态。
 * @param props 标签及布局样式。
 * @returns 加载状态图标。
 */
export function Spinner({ className, label = "正在加载" }: { className?: string; label?: string }): ReactElement {
  return <span role="status" className={cn("inline-flex items-center justify-center text-text-muted", className)}><LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /><span className="sr-only">{label}</span></span>;
}
