import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Clock3 } from "lucide-react";
import type { ReactElement } from "react";
import { site } from "@/config/site";
import { getPost } from "@/features/blog/api/posts";
import { ArticleOutline } from "@/features/blog/components/article-outline";
import { CopyButton } from "@/features/blog/components/copy-button";
import { Markdown } from "@/features/blog/components/markdown";
import {
  formatDate,
  readingMinutes,
  safeImageUrl,
} from "@/features/blog/format";
import {
  blogHref,
  parseReturnTo,
  type SearchValues,
} from "@/features/blog/navigation";

type ArticleProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchValues>;
};
/** 文章每次请求都重新读取发布状态，避免撤回后仍被缓存访问。 */
export const dynamic = "force-dynamic";

/**
 * 将文章标题、摘要和时间提供给搜索引擎及社交分享。
 * @param props Next.js 异步文章参数。
 * @returns 当前公开文章的元数据。
 */
export async function generateMetadata({
  params,
}: ArticleProps): Promise<Metadata> {
  const post = await getPost((await params).id);
  if (!post) return { title: "文章未找到", robots: { index: false } };
  const cover = safeImageUrl(post.cover);
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.id}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.id}`,
      publishedTime: post.date,
      modifiedTime: post.updatedAt,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
      images: cover ? [cover] : undefined,
    },
  };
}

/**
 * 文章正文保持服务端渲染，只有目录和复制按钮需要客户端交互。
 * @param props App Router 动态文章 ID。
 * @returns 完整阅读页面，不存在时进入统一 404。
 */
export default async function ArticlePage({
  params,
  searchParams,
}: ArticleProps): Promise<ReactElement> {
  const post = await getPost((await params).id);
  if (!post) notFound();
  const cover = safeImageUrl(post.cover);
  const returnTo = parseReturnTo((await searchParams).from);
  return (
    <div className="reading-layout">
      <article className="reading-article">
        <Link className="back-link" href={returnTo}>
          <ArrowLeft size={16} aria-hidden="true" />
          全部文章
        </Link>
        <header className="article-header">
          <h1>{post.title}</h1>
          <div className="post-meta">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            {post.author && (
              <>
                <span aria-hidden="true">·</span>
                <span>{post.author}</span>
              </>
            )}
          <div className="post-tags">
            {post.tags.map((tag) => (
              <Link key={tag} href={blogHref({ tag })}>
                {tag}
              </Link>
            ))}
          </div>
            <span className="reading-time">
              <Clock3 size={14} aria-hidden="true" />约{" "}
              {readingMinutes(post.content)} 分钟
            </span>
          </div>
        </header>
        {cover && (
          <Image
            className="article-cover"
            src={cover}
            alt=""
            width={1200}
            height={675}
            unoptimized
          />
        )}
        <Markdown content={post.content} />
        <footer className="article-footer">
          <div>
            <p>感谢阅读</p>
            <span>更新于 {formatDate(post.updatedAt)}</span>
          </div>
          <CopyButton
            text={new URL(`/blog/${post.id}`, site.url).href}
            label="分享文章"
          />
        </footer>
        <Link className="back-link" href={returnTo}>
          <ArrowLeft size={16} aria-hidden="true" />
          继续发现更多文章
        </Link>
      </article>
      <aside className="outline-column">
        <ArticleOutline key={post.id} />
      </aside>
    </div>
  );
}
