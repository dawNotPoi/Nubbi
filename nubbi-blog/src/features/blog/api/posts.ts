import "server-only";
import { cache } from "react";
import { BlogApiError, requestBlogData } from "./request";
import {
  postPageSchema,
  postSchema,
  tagsSchema,
  type BlogTag,
  type Post,
  type PostPage,
} from "./contracts";
import { PAGE_SIZE, type BlogFilters } from "../navigation";

/**
 * 列表页仅依赖 URL 中的筛选条件，无浏览器会话缓存。
 * @param filters 标准化后的搜索、标签和页码。
 * @returns 后端返回的文章分页。
 */
export async function getPosts(filters: BlogFilters): Promise<PostPage> {
  const query = new URLSearchParams({
    offset: String((filters.page - 1) * PAGE_SIZE),
    limit: String(PAGE_SIZE),
    q: filters.q,
    tag: filters.tag,
    order: filters.order,
  });
  return requestBlogData(`posts?${query}`, postPageSchema);
}

/**
 * 标签和列表采用相同的公开条件。
 * @returns 可选的标签列表。
 */
export async function getTags(): Promise<BlogTag[]> {
  return requestBlogData("tags", tagsSchema);
}

/**
 * 同一次服务端渲染复用元数据和页面的请求，不跨请求缓存正文。
 * @param id 路由传入的文章 ID。
 * @returns 公开文章；无效或不可公开的 ID 返回 null。
 */
export const getPost = cache(async (id: string): Promise<Post | null> => {
  if (!/^[a-f\d]{24}$/i.test(id)) return null;
  try {
    return await requestBlogData(`posts/${encodeURIComponent(id)}`, postSchema);
  } catch (error) {
    if (error instanceof BlogApiError && error.status === 404) return null;
    throw error;
  }
});
