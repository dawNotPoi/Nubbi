"use client";

import type { ReactElement } from "react";
import { AnchorLink } from "@/components/anchor-link";
import { ArrowUp } from "lucide-react";
import { useArticleOutline, type OutlineItem } from "../hooks/use-article-outline";

/**
 * 以真实正文标题生成 Dawn 的桌面侧边目录。
 * @param props 标题列表及当前可见章节。
 * @returns 指向正文锚点的链接。
 */
function OutlineLinks({ headings, activeId }: {
  headings: OutlineItem[];
  activeId: string;
}): ReactElement {
  return (
    <nav aria-label="本文目录">
      {headings.map((heading, index) => (
        <AnchorLink key={heading.id} href={`#${heading.id}`} data-depth={heading.depth}
          aria-current={activeId === heading.id ? "location" : undefined}>
          <span className="outline-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span>{heading.title}</span>
        </AnchorLink>
      ))}
    </nav>
  );
}

/**
 * 展示正文生成的章节与阅读进度，长文章目录独立滚动。
 * @returns 桌面文章目录。
 */
export function ArticleOutline(): ReactElement {
  const { headings, activeId, progress } = useArticleOutline();
  return (
    <div className="article-outline">
      {headings.length > 0 && <>
        <p className="outline-title">本文目录</p>
        <OutlineLinks headings={headings} activeId={activeId} />
      </>}
      <div className="reading-progress">
        <div><label htmlFor="article-progress">阅读进度</label><span aria-hidden="true">{progress}%</span></div>
        <progress id="article-progress" max={100} value={progress} />
      </div>
      <AnchorLink className="outline-top" href="#top">回到顶部<ArrowUp size={13} aria-hidden="true" /></AnchorLink>
    </div>
  );
}
