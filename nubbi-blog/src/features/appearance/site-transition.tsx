"use client";

import { addTransitionType, startTransition, ViewTransition, type ReactElement, type ReactNode } from "react";

/**
 * 统一配置主题与正文边界；主题活动期间 CSS 将快照合并到根元素。
 * @param props 边界职责及原有 DOM 内容，不添加布局容器。
 * @returns 由 React 统一调度的过渡边界。
 */
export function SiteTransition({ scope, children }: {
  scope: "theme" | "page";
  children: ReactNode;
}): ReactElement {
  return (
    <ViewTransition default="none" update={scope === "theme"
      ? { "theme-change": "theme-source", default: "none" }
      : { "theme-change": "none", "nav-back": "page-back", default: "page-change" }}>
      {children}
    </ViewTransition>
  );
}

/**
 * 将主题状态更新加入 React 调度；能力不足时保留直接换色。
 * @param update 只提交 React 状态的更新函数。
 * @returns 无返回值。
 */
export function runThemeTransition(update: () => void): void {
  if (!document.startViewTransition
    || !CSS.supports("selector(:active-view-transition-type(theme-change))")
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  startTransition(() => {
    addTransitionType("theme-change");
    update();
  });
}
