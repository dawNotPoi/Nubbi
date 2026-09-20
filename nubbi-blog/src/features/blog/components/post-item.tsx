import type { ReactElement } from "react";
import type { PostSummary } from "../api/contracts";
import { formatPostDate } from "../format";
import { IntentLink } from "./intent-link";

/**
 * 紧凑条目只保留标题、单行摘要和元信息，整行保持原生链接行为。
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
    <article className="post-item">
      <IntentLink href={href} className="compact-post" aria-label={post.title}>
        <Heading className="post-title">{post.title}</Heading>
        {post.excerpt && <p className="post-excerpt">{post.excerpt}</p>}
        <div className="post-meta">
          <time dateTime={date}>{updated && "更新于 "}{formatPostDate(date)}</time>
          {post.tags.length > 0 && <>
            <span className="meta-separator" aria-hidden="true">·</span>
            <span className="post-meta-topics" title={post.tags.join("、")}>
              {post.tags.slice(0, 2).join(" / ")}
              {post.tags.length > 2 && <span className="post-more-tags">+{post.tags.length - 2}</span>}
            </span>
          </>}
        </div>
      </IntentLink>
    </article>
  );
}
