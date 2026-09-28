"use client";

import { createContext, useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { getThemeSnapshot, saveTheme, subscribeTheme, type Theme } from "./preferences";
import { runThemeTransition } from "./site-transition";

/** 点击位置使用视口坐标，与浏览器根快照保持一致。 */
export interface ThemeOrigin { x: number; y: number }

/** 外观组件仅消费主题与切换操作，不操作 DOM 或存储。 */
export const ThemeContext = createContext<{
  theme: Theme;
  toggle: (origin: ThemeOrigin) => void;
} | null>(null);

interface ThemeSelection {
  theme: Theme;
  explicit: boolean;
  persist: boolean;
  origin?: ThemeOrigin;
}

/**
 * 让图标与页面配色在同一次 React 提交中更新。
 * @param props 保持原有服务器组件树的页面内容。
 * @returns 全站共享的主题状态入口。
 */
export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const [selection, setSelection] = useState<ThemeSelection | null>(null);
  const requested = useRef<Theme | null>(null);

  useEffect(() => subscribeTheme((theme, explicit) => {
    requested.current = theme;
    setSelection({ theme, explicit, persist: false });
  }), []);

  useLayoutEffect(() => {
    if (!selection) return;
    const root = document.documentElement;
    if (selection.explicit) root.dataset.theme = selection.theme;
    else delete root.dataset.theme;
    if (selection.origin) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const x = Math.max(0, Math.min(selection.origin.x, width));
      const y = Math.max(0, Math.min(selection.origin.y, height));
      root.style.setProperty("--theme-origin-x", `${x}px`);
      root.style.setProperty("--theme-origin-y", `${y}px`);
      root.style.setProperty("--theme-radius", `${Math.hypot(Math.max(x, width - x), Math.max(y, height - y))}px`);
    }
    if (selection.persist) saveTheme(selection.theme);
  }, [selection]);

  /**
   * 请求主题独立于已渲染主题，连续点击时每次操作都计入最终选择。
   * @param origin 指针位置或键盘触发按钮的中心。
   * @returns 无返回值。
   */
  const toggle = (origin: ThemeOrigin): void => {
    const theme = (requested.current ?? getThemeSnapshot()) === "dark" ? "light" : "dark";
    requested.current = theme;
    runThemeTransition(() => setSelection({ theme, explicit: true, persist: true, origin }));
  };

  return <ThemeContext value={{ theme: selection?.theme ?? "light", toggle }}>{children}</ThemeContext>;
}
