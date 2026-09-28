import { CalendarDays } from "lucide-react";
import type { ReactElement } from "react";
import type { PostSummary } from "../api/contracts";
import { formatDate } from "../format";
import { IntentLink } from "./intent-link";

/**
 * 恢复 Dawn 的标题、标签、摘要和日期卡片分区，数据只使用公开白名单。
 * @param props 已校验的文章、返回地址和标题层级。
 * @returns 可通过鼠标、键盘或新标签打开的文章条目。
 */
export function PostItem({ post, returnTo = "/blog", headingLevel = 2, updated = false }: {
  post: PostSummary;
  returnTo?: string;
  headingLevel?: 2 | 3;
  updated?: boolean;
}): ReactElement {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const href = `/blog/${post.id}${returnTo === "/blog" ? "" : `?${new URLSearchParams({ from: returnTo })}`}`;
  const date = updated ? post.updatedAt : post.date;
  return (
    <article className="post-item dawn-post">
      <div className="dawn-post-card">
        <header className="dawn-post-header">
          <Heading className="post-title"><IntentLink href={href}>{post.title}</IntentLink></Heading>
          {post.tags.length > 0 && <div className="post-tags">
            {post.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>}
        </header>
        {post.excerpt && <IntentLink href={href} className="post-excerpt" aria-label={`阅读${post.title}摘要`}><span>{post.excerpt}</span></IntentLink>}
        <footer className="post-meta">
          <CalendarDays size={14} aria-hidden="true" />
          <time dateTime={date}>{updated && "更新于 "}{formatDate(date)}</time>
        </footer>
      </div>
    </article>
  );
}
