import Link from "next/link";
import type { ReactElement } from "react";
import type { PostSummary } from "../api/contracts";
import { formatPostDate } from "../format";
import { IntentLink } from "./intent-link";
import { BLOG_COPY } from "../copy";

/**
 * 首页保留 Dawn 的最近文章时间线，移除没有博客接口的会议栏。
 * @param props 最近公开文章。
 * @returns 近期文章入口。
 */
export function HomeTimeline({ posts }: {
  posts: PostSummary[];
}): ReactElement {
  return (
    <div className="home-timeline-grid" id="recent-posts">
      <section className="home-timeline-section" aria-labelledby="recent-articles-title">
        <div className="timeline-heading">
          <div><span className="eyebrow">RECENT WRITING</span><h2 id="recent-articles-title">近来落笔</h2></div>
          {posts.length > 0 && <Link className="timeline-more" href="/blog">翻阅文集 ↗</Link>}
        </div>
        <ul className="home-timeline">
          {posts.length ? posts.slice(0, 6).map((post) => (
            <li key={post.id}>
              <IntentLink href={`/blog/${post.id}`} className="timeline-link">{post.title}</IntentLink>
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            </li>
          )) : <li className="timeline-empty"><span>{BLOG_COPY.emptyTitle}，{BLOG_COPY.emptyDescription}</span></li>}
        </ul>
      </section>
    </div>
  );
}
