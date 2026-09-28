import Link from "next/link";
import type { ReactElement } from "react";
import { getPosts } from "../api/posts";
import { blogHref, type BlogFilters } from "../navigation";
import { Pagination } from "./pagination";
import { PostItem } from "./post-item";
import { HomeIntro } from "./home-intro";
import { HomeTimeline } from "./home-timeline";
import { BLOG_COPY } from "../copy";

/**
 * 公开文章保持服务端渲染，原站首页时间线和博客卡片直接读取主服务。
 * @param props 来自 URL 的筛选条件与首页展示标记。
 * @returns 单列卡片页或首页近期文章。
 */
export async function PostList({ filters, showIntro = false }: {
  filters: BlogFilters;
  showIntro?: boolean;
}): Promise<ReactElement> {
  const page = await getPosts(filters);
  if (showIntro) return <><HomeIntro /><HomeTimeline posts={page.items} /></>;
  const filtered = Boolean(filters.q || filters.tag);
  return (
    <div className="blog-layout">
      <header className="collection-header">
        <span className="eyebrow">WORDS & MOMENTS</span>
        <h1>文集<span className="collection-count">{page.total} 篇</span></h1>
        <p>{BLOG_COPY.collectionDescription}</p>
      </header>
      <section id="articles" className="article-feed" aria-label="文章列表">
        {filtered && <div className="filter-summary" role="status">
          <span>{filters.q && `“${filters.q}”`}{filters.q && filters.tag && " · "}{filters.tag && `# ${filters.tag}`}</span>
          <Link href={blogHref({ order: filters.order })}>清除筛选</Link>
        </div>}
        {page.items.length ? page.items.map((post) => (
          <PostItem post={post} key={post.id} returnTo={blogHref(filters)} updated={filters.order === "updated"} />
        )) : <div className="empty-state">
          <p className="empty-title">{filtered ? "没有找到相关文章" : BLOG_COPY.emptyTitle}</p>
          <p>{filtered ? "试试其他关键词，或翻阅全部文章。" : BLOG_COPY.emptyDescription}</p>
          {(filtered || filters.page > 1) && <Link className="text-link" href="/blog">浏览全部文章 →</Link>}
        </div>}
        <Pagination filters={filters} total={page.total} />
      </section>
    </div>
  );
}
