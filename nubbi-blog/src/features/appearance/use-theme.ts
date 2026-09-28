"use client";

import { useContext, type MouseEvent } from "react";
import type { Theme } from "./preferences";
import { ThemeContext } from "./theme-provider";

/**
 * 将偏好存储与展示组件隔离，切换时读取实时状态避免快速点击丢失。
 * @returns 当前生效主题及切换操作。
 */
export function useTheme(): { theme: Theme; toggle: (event: MouseEvent<HTMLButtonElement>) => void } {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme 必须在 ThemeProvider 内使用");
  /**
   * 键盘合成点击没有可靠指针坐标，使用按钮中心保证动画来源一致。
   * @param event 用户激活主题按钮的事件。
   * @returns 无返回值。
   */
  const toggle = (event: MouseEvent<HTMLButtonElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    context.toggle({
      x: event.detail === 0 ? rect.left + rect.width / 2 : event.clientX,
      y: event.detail === 0 ? rect.top + rect.height / 2 : event.clientY,
    });
  };
  return { theme: context.theme, toggle };
}
