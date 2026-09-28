"use client";

import { Moon, Sun } from "lucide-react";
import type { ReactElement } from "react";
import { useTheme } from "@/features/appearance/use-theme";
import { SiteTransition } from "@/features/appearance/site-transition";

/**
 * 提供独立于两个页面导航的亮暗主题切换。
 * @returns 有明确目标名称的主题按钮。
 */
export function ThemeToggle(): ReactElement {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "切换为亮色主题" : "切换为暗色主题";
  return (
    <SiteTransition scope="theme">
      <button className="icon-button theme-toggle" type="button" onClick={toggle} aria-label={label} title={label}>
        {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      </button>
    </SiteTransition>
  );
}
