"use client";

import type { ReactElement } from "react";
import { useReadingLayout } from "../hooks/use-reading-layout";

/**
 * 两个明确的阅读选项共用于侧栏和手机工具栏，改变字号不会重新渲染正文。
 * @returns 字体选择与大字模式开关。
 */
export function ReadingControls(): ReactElement {
  const { preferences, update } = useReadingLayout();
  return (
    <div className="reading-controls" role="group" aria-label="阅读排版">
      <label className="reading-font">
        <span className="sr-only">正文字体</span>
        <select value={preferences.font} onChange={(event) => {
          const value = event.target.value;
          if (value === "serif" || value === "sans") update({ font: value });
        }}>
          <option value="serif">宋体</option>
          <option value="sans">黑体</option>
        </select>
      </label>
      <button type="button" className="reading-size" aria-label="大字阅读" aria-pressed={preferences.size === "large"}
        onClick={() => update({ size: preferences.size === "large" ? "standard" : "large" })}>
        <span aria-hidden="true">A<span>+</span></span>
      </button>
    </div>
  );
}
