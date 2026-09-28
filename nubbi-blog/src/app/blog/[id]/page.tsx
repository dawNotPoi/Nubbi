import Image from "next/image";
import Link from "next/link";
import { AnchorLink } from "@/components/anchor-link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUp, Clock3 } from "lucide-react";
import type { ReactElement } from "react";
import { getPost } from "@/features/blog/api/posts";
import { ArticleOutline } from "@/features/blog/components/article-outline";
import { Markdown } from "@/features/blog/components/markdown";
import { CopyButton } from "@/features/blog/components/copy-button";
import { site } from "@/config/site";
import {
  formatDate,
  readingMinutes,
  safeImageUrl,
} from "@/features/blog/format";
import {
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
 * 正文与文章信息保持服务端渲染，阅读交互消费真实公开文章。
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
    <article className="reading-layout" aria-labelledby="article-title">
      <header className="article-header">
        <Link className="back-link" href={returnTo} transitionTypes={["nav-back"]}>
          <ArrowLeft size={16} aria-hidden="true" />
          返回文集
        </Link>
        <span className="eyebrow article-overline">THOUGHTS & STORIES</span>
        <h1 id="article-title">{post.title}</h1>
        {post.excerpt && <p className="article-summary">{post.excerpt}</p>}
        <div className="article-byline">
          <div className="post-meta article-meta">
            {post.tags.length > 0 && <div className="post-tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span className="reading-duration"><Clock3 size={14} aria-hidden="true" />约 {readingMinutes(post.content)} 分钟</span>
          </div>
          <CopyButton text={new URL(`/blog/${post.id}`, site.url).href} label="复制链接" />
        </div>
      </header>
      <div className="reading-article">
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
        <Markdown content={post.content} title={post.title} />
        <footer className="article-footer">
          <p>感谢你读到这里。</p>
          <div>
            <Link className="text-link" href={returnTo} transitionTypes={["nav-back"]}><ArrowLeft size={16} aria-hidden="true" />返回文集</Link>
            <AnchorLink className="text-link" href="#top">回到顶部<ArrowUp size={16} aria-hidden="true" /></AnchorLink>
          </div>
        </footer>
      </div>
      <aside className="outline-column">
        <ArticleOutline key={post.id} />
      </aside>
    </article>
  );
}
