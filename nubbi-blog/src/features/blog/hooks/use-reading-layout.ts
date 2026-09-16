"use client";

import { useReaderPreferences } from "@/features/appearance/use-reader-preferences";
import type { ReaderPreferences } from "@/features/appearance/preferences";

/**
 * 调整长文排版时保持正在阅读的段落，避免前文重新换行把读者带到其他章节。
 * @returns 阅读偏好和保留位置的更新方法。
 */
export function useReadingLayout(): ReturnType<typeof useReaderPreferences> {
  const { preferences, update } = useReaderPreferences();
  /**
   * 用户主动改变排版时只测量一次可见段落，滚动过程没有额外布局工作。
   * @param patch 字体或字号设置。
   * @returns 无返回值。
   */
  const updateLayout = (patch: Partial<ReaderPreferences>): void => {
    const body = document.getElementById("article-body");
    const anchor = body && body.getBoundingClientRect().top < 80
      ? Array.from(body.children).find((element) => element.getBoundingClientRect().bottom > 80)
      : undefined;
    const previousTop = anchor?.getBoundingClientRect().top ?? 0;
    update(patch);
    if (anchor) window.scrollBy({ top: anchor.getBoundingClientRect().top - previousTop, behavior: "instant" });
  };
  return { preferences, update: updateLayout };
}
