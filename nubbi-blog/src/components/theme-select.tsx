"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { ReactElement } from "react";
import { useReaderPreferences } from "@/features/appearance/use-reader-preferences";

/**
 * 使用原生选择控件，触屏、键盘和系统读屏均可直接切换外观。
 * @returns 紧凑的主题选择器。
 */
export function ThemeSelect(): ReactElement {
  const { preferences, update } = useReaderPreferences();
  const Icon = preferences.theme === "dark" ? Moon : preferences.theme === "light" ? Sun : Monitor;
  return (
    <label className="theme-select">
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">外观主题</span>
      <select value={preferences.theme} onChange={(event) => {
        const value = event.target.value;
        if (value === "system" || value === "light" || value === "dark") update({ theme: value });
      }}>
        <option value="system">自动</option>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
    </label>
  );
}
