"use client";

import { useEffect, useState } from "react";

/** 正文实际渲染出的目录项，与 Markdown 标题锚点保持一致。 */
export type OutlineItem = { id: string; title: string; depth: number };

/**
 * 合并滚动事件，在标题之间保持准确章节；正文变高时重新计算位置。
 * @returns 实际目录、当前章节和阅读进度。
 */
export function useArticleOutline(): {
  headings: OutlineItem[];
  activeId: string;
  progress: number;
} {
  const [headings, setHeadings] = useState<OutlineItem[]>([]);
  const [position, setPosition] = useState({ activeId: "", progress: 0 });
  useEffect(() => {
    const body = document.getElementById("article-body");
    if (!body) return;
    const elements = Array.from(
      body.querySelectorAll<HTMLHeadingElement>(
        "h2:not(.sr-only), h3:not(.sr-only)",
      ),
    );
    let points: number[] = [];
    let top = 0;
    let height = 0;
    let anchorOffset = 0;
    let frame = 0;
    /** 按缓存位置定位章节，滚动时不逐个查询标题布局。 */
    const update = (): void => {
      frame = 0;
      const current = window.scrollY + anchorOffset;
      let index = 0;
      for (let i = 0; i < points.length && points[i] <= current; i++) index = i;
      const atEnd = window.scrollY + window.innerHeight >= top + height - 8;
      if (atEnd)
        index = Math.max(0, elements.length - 1);
      const available = Math.max(1, height - window.innerHeight + anchorOffset);
      const progress =
        atEnd
          ? 100
          : Math.round(
              Math.max(
                0,
                Math.min(1, (window.scrollY - top + anchorOffset) / available),
              ) * 100,
            );
      const activeId = elements[index]?.id || "";
      setPosition((previous) =>
        previous.activeId === activeId && previous.progress === progress
          ? previous
          : { activeId, progress },
      );
    };
    /** 同一帧的多次滚动只触发一次状态更新。 */
    const schedule = (): void => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    /** 图片和卡片加载后重新测量，避免目录与实际正文位置脱节。 */
    const measure = (): void => {
      // 锚点滚动会叠加页面留白与标题留白，额外一像素容纳浏览器的取整差异。
      const pagePadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const headingMargin = parseFloat(getComputedStyle(elements[0] ?? body).scrollMarginTop) || 0;
      anchorOffset = pagePadding + headingMargin + 1;
      top = body.getBoundingClientRect().top + window.scrollY;
      height = body.offsetHeight;
      points = elements.map(
        (element) => element.getBoundingClientRect().top + window.scrollY,
      );
      schedule();
    };
    const setup = requestAnimationFrame(() => {
      setHeadings(
        elements.map((element) => ({
          id: element.id,
          title: element.textContent || "",
          depth: Number(element.tagName.slice(1)),
        })),
      );
      measure();
    });
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    // 封面在正文节点之外，加载后也可能改变正文起点。
    const article = body.closest(".reading-layout");
    if (article) observer.observe(article);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(setup);
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
    };
  }, []);
  return { headings, ...position };
}
