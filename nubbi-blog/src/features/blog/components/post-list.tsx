import Link from "next/link";
import { FileText } from "lucide-react";
import type { ReactElement } from "react";
import { getPosts, getTags } from "../api/posts";
import { blogHref, type BlogFilters } from "../navigation";
import { Pagination } from "./pagination";
import { PostItem } from "./post-item";
import { PostToolbar } from "./post-toolbar";
import { BlogExplorer } from "./blog-explorer";
import { HomeIntro } from "./home-intro";

/**
 * 公开文章保持服务端渲染，首页和文稿页共用紧凑列表与探索工具。
 * @param props 来自 URL 的筛选条件与首页展示标记。
 * @returns 两栏文稿页或首页近期文章。
 */
export async function PostList({ filters, showIntro = false }: {
  filters: BlogFilters;
  showIntro?: boolean;
}): Promise<ReactElement> {
  const [page, tags] = await Promise.all([getPosts(filters), getTags()]);
  const filtered = Boolean(filters.q || filters.tag);
  const Heading = showIntro ? "h2" : "h1";
  return (
    <>
      {showIntro && <HomeIntro />}
      <div className="blog-layout" id="topics">
        <header className="feed-header">
          <span className="eyebrow">{showIntro ? "RECENT POSTS" : "BLOG"}</span>
          <Heading>{filters.q ? "搜索结果" : filters.tag || (showIntro ? "最近文章" : "文章")}</Heading>
        </header>
        <div className="feed-toolbar"><PostToolbar total={page.total} filters={filters} /></div>
        <BlogExplorer key={JSON.stringify(filters)} tags={tags} filters={filters} />
        <section id="articles" className="article-feed" aria-label="文章列表">
          {filtered && <div className="filter-summary" role="status">
            <span>{filters.q && `“${filters.q}”`}{filters.q && filters.tag && " · "}{filters.tag && `# ${filters.tag}`}</span>
            <Link href={blogHref({ order: filters.order })}>清除筛选</Link>
          </div>}
          {page.items.length ? page.items.map((post) => (
            <PostItem post={post} key={post.id} returnTo={blogHref(filters)}
              headingLevel={showIntro ? 3 : 2} updated={filters.order === "updated"} />
          )) : <div className="empty-state">
            <FileText size={28} strokeWidth={1.3} aria-hidden="true" />
            <p className="empty-title">{filtered ? "没有找到相关文章" : filters.page > 1 ? "这一页还没有文章" : "故事，正在酝酿"}</p>
            <p>{filtered ? "试试其他关键词，或换一个主题。" : "新的记录发布后，会出现在这里。"}</p>
            {(filtered || filters.page > 1) && <Link className="text-link" href="/blog">浏览全部文章 →</Link>}
          </div>}
          <Pagination filters={filters} total={page.total} />
        </section>
      </div>
    </>
  );
}
