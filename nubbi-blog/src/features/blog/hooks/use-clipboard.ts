"use client";

import { useEffect, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "failed";

/**
 * 封装剪贴板权限、反馈和定时器清理，供代码块与分享按钮复用。
 * @returns 当前复制状态及异步复制方法。
 */
export function useClipboard(): {
  status: CopyStatus;
  copy: (text: string) => Promise<void>;
} {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /**
   * 仅在用户点击时请求写入剪贴板，失败时保留可见反馈。
   * @param text 需要复制的文本。
   * @returns 剪贴板操作完成后的空值。
   */
  async function copy(text: string): Promise<void> {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    timer.current = setTimeout(() => setStatus("idle"), 2_500);
  }
  return { status, copy };
}
