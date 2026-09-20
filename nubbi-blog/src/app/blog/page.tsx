import { Suspense, type ReactElement } from "react";
import type { Metadata } from "next";
import { PostList } from "@/features/blog/components/post-list";
import {
  parseFilters,
  blogHref,
  type SearchValues,
} from "@/features/blog/navigation";
import Loading from "../loading";

/** 筛选结果不使用构建时快照。 */
export const dynamic = "force-dynamic";

/**
 * 搜索结果不索引，纯文章分页使用规范 URL。
 * @param props 原始查询参数。
 * @returns 当前列表页面的元数据。
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}): Promise<Metadata> {
  const filters = parseFilters(await searchParams);
  return {
    title: filters.q
      ? `搜索：${filters.q}`
      : filters.tag
        ? `主题：${filters.tag}`
        : "文章",
    alternates: {
      canonical:
        blogHref({ ...filters, order: "newest" }),
    },
    robots:
      filters.q || filters.tag || filters.order !== "newest" ? { index: false, follow: true } : undefined,
  };
}

/**
 * 兼容 Dawn 原博客入口，分页与筛选通过 URL 驱动。
 * @param props App Router 查询参数。
 * @returns 服务端渲染的文章列表。
 */
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}): Promise<ReactElement> {
  const filters = parseFilters(await searchParams);
  return (
    <Suspense key={JSON.stringify(filters)} fallback={<Loading />}>
      <PostList filters={filters} />
    </Suspense>
  );
}
