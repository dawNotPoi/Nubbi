import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 状态提示的语义与内容。 */
export interface AlertProps { tone?: "info" | "success" | "warning" | "error"; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }
const TONE_CLASSES = { info: "bg-bg-hover text-text-primary", success: "bg-[var(--status-active-bg)] text-[var(--status-active-text)]", warning: "bg-[var(--status-inbox-bg)] text-[var(--status-inbox-text)]", error: "bg-[var(--danger-bg)] text-[var(--danger-text)]" };
const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };
/**
 * 展示需留在页面中的状态说明；短暂操作结果使用 Toast。
 * @param props 语义、标题、说明和可选动作。
 * @returns 可访问的状态说明。
 */
export function Alert({ tone = "info", title, children, action, className }: AlertProps): ReactElement {
  const Icon = ICONS[tone];
  return <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-control border border-border-row p-3 text-sm", TONE_CLASSES[tone], className)}>
    <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
    <div className="min-w-0 flex-1 break-words">{title && <div className="font-medium">{title}</div>}{children && <div className={title ? "mt-1 leading-relaxed" : "leading-relaxed"}>{children}</div>}{action && <div className="mt-2">{action}</div>}</div>
  </div>;
}
