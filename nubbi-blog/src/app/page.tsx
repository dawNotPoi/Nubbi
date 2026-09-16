import { Suspense, type ReactElement } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostList } from "@/features/blog/components/post-list";
import {
  blogHref,
  parseFilters,
  type SearchValues,
} from "@/features/blog/navigation";
import Loading from "./loading";

/** 首页公开文章始终按当前发布状态读取。 */
export const dynamic = "force-dynamic";
/** 文章流以首页为规范地址。 */
export const metadata: Metadata = { alternates: { canonical: "/" } };

/**
 * 首页复用博客列表，服务端解析异步查询参数。
 * @param props App Router 查询参数。
 * @returns 带导航加载反馈的文章流。
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}): Promise<ReactElement> {
  const filters = parseFilters(await searchParams);
  if (filters.q || filters.tag || filters.page > 1 || filters.order !== "newest") redirect(blogHref(filters));
  return (
    <Suspense key={JSON.stringify(filters)} fallback={<Loading />}>
      <PostList filters={filters} showIntro />
    </Suspense>
  );
}
