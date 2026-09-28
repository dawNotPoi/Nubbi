import type { ReactElement } from "react";
import { HomeIntro } from "./home-intro";
import { BLOG_COPY } from "../copy";

/**
 * 提供装饰性文字占位，状态说明由外层统一播报。
 * @returns 三行宽度不同的段落占位。
 */
function ParagraphSkeleton(): ReactElement {
  return (
    <div className="skeleton-paragraph" aria-hidden="true">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton skeleton-medium" />
    </div>
  );
}

/**
 * 首页等待公开文章时保留真实介绍，仅为时间线显示占位。
 * @returns 首页的主题化加载状态。
 */
export function HomeLoading(): ReactElement {
  return (
    <>
      <HomeIntro />
      <section className="home-timeline-grid" id="recent-posts" role="status" aria-label="正在加载近期文章">
        <span className="sr-only">正在加载近期文章…</span>
        <div className="home-timeline-section" aria-hidden="true">
          <div className="timeline-heading">
            <div><span className="eyebrow">RECENT WRITING</span><h2>近来落笔</h2></div>
          </div>
          <div className="timeline-skeleton">
            {[0, 1, 2].map((key) => <div className="skeleton-timeline-row" key={key}>
              <div className="skeleton skeleton-medium" /><div className="skeleton skeleton-date" />
            </div>)}
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * 文集保留页头与条目分区，等待中不生成虚构篇数或链接。
 * @returns 文章列表加载占位。
 */
export function CollectionLoading(): ReactElement {
  return (
    <div className="blog-layout" role="status" aria-label="正在加载文集">
      <span className="sr-only">正在加载文集…</span>
      <div className="collection-header" aria-hidden="true">
        <span className="eyebrow">WORDS & MOMENTS</span>
        <h1>文集</h1>
        <p>{BLOG_COPY.collectionDescription}</p>
      </div>
      <div className="collection-skeleton" aria-hidden="true">
        {[0, 1, 2].map((key) => <div className="skeleton-post" key={key}>
          <div className="skeleton skeleton-post-title" />
          <div className="skeleton skeleton-tag" />
          <ParagraphSkeleton />
          <div className="skeleton skeleton-date" />
        </div>)}
      </div>
    </div>
  );
}

/**
 * 阅读等待使用正文的真实栅格，预留标题与目录位置。
 * @returns 不含交互假入口的文章加载占位。
 */
export function ReadingLoading(): ReactElement {
  return (
    <div className="reading-layout reading-skeleton" role="status" aria-label="正在加载正文">
      <span className="sr-only">正在加载正文…</span>
      <div className="article-header" aria-hidden="true">
        <div className="skeleton skeleton-back" />
        <div className="skeleton skeleton-overline" />
        <div className="skeleton skeleton-article-title" />
        <div className="skeleton skeleton-medium" />
        <div className="article-byline"><div className="skeleton skeleton-short" /></div>
      </div>
      <div className="reading-article" aria-hidden="true">
        {[0, 1, 2].map((key) => <ParagraphSkeleton key={key} />)}
      </div>
      <aside className="outline-column" aria-hidden="true">
        <div className="article-outline"><ParagraphSkeleton /></div>
      </aside>
    </div>
  );
}
