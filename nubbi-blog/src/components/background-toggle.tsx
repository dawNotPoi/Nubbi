"use client";

import type { ReactElement } from "react";
import { useReaderPreferences } from "@/features/appearance/use-reader-preferences";

/**
 * 读者可关闭装饰性背景，偏好与主题共用存储层。
 * @returns 有文字标签的原生背景开关。
 */
export function BackgroundToggle(): ReactElement {
  const { preferences, update } = useReaderPreferences();
  return <label className="background-toggle"><input type="checkbox" checked={preferences.effects === "on"}
    onChange={(event) => update({ effects: event.target.checked ? "on" : "off" })} />背景效果</label>;
}
