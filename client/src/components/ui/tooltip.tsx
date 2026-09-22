import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";
/**
 * 非交互的辅助说明，关键操作名称仍由按钮自身提供。
 * @param props 触发元素与说明。
 * @returns 同时支持悬停与焦点的提示。
 */
export function Tooltip({ children, content }: { children: ReactElement; content: ReactNode }): ReactElement {
  return <BaseTooltip.Provider><BaseTooltip.Root><BaseTooltip.Trigger render={children} /><BaseTooltip.Portal><BaseTooltip.Positioner sideOffset={6} className="z-[1300]"><BaseTooltip.Popup className="max-w-xs rounded-control bg-text-primary px-2.5 py-1.5 text-xs text-surface shadow-[var(--shadow-popover)]">{content}</BaseTooltip.Popup></BaseTooltip.Positioner></BaseTooltip.Portal></BaseTooltip.Root></BaseTooltip.Provider>;
}
