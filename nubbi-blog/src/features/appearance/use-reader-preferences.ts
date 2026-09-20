"use client";

import { useSyncExternalStore } from "react";
import { parsePreferences, preferenceSnapshot, serverPreferenceSnapshot, subscribePreferences, updatePreferences, type ReaderPreferences } from "./preferences";

/**
 * 将浏览器外观状态接入 React，服务器始终使用相同默认快照。
 * @returns 当前偏好与独立存储层提供的更新方法。
 */
export function useReaderPreferences(): {
  preferences: ReaderPreferences;
  update: typeof updatePreferences;
} {
  const snapshot = useSyncExternalStore(subscribePreferences, preferenceSnapshot, serverPreferenceSnapshot);
  return { preferences: parsePreferences(snapshot), update: updatePreferences };
}
