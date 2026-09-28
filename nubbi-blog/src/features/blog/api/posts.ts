import "server-only";
import { cache } from "react";
import { BlogApiError, BlogConfigurationError, requestBlogData } from "./request";
import type { Post, PostPage } from "./contracts";
import { isPublicNote, notePageSchema, noteDetailSchema, presentNote } from "./note-adapter";
import { PAGE_SIZE, type BlogFilters } from "../navigation";

/**
 * 列表页仅依赖 URL 中的筛选条件，无浏览器会话缓存。
 * @param filters 标准化后的搜索、标签和页码。
 * @returns 适配后的文章分页；未配置 Token 或连接失败时返回空分页。
 */
export async function getPosts(filters: BlogFilters): Promise<PostPage> {
  try {
    const offset = (filters.page - 1) * PAGE_SIZE;
    const query = new URLSearchParams({
      published: "true", hasPassword: "false", limit: String(PAGE_SIZE), offset: String(offset),
      q: filters.q, tag: filters.tag, order: filters.order,
    });
    const page = await requestBlogData(`all?${query}`, notePageSchema);
    if (page.offset !== offset || page.limit !== PAGE_SIZE || page.count !== page.items.length
      || page.count > PAGE_SIZE || (page.count > 0 && page.total < offset + page.count)
      || page.hasMore !== (page.count > 0 && offset + page.count < page.total)
      || page.nextOffset !== (page.hasMore ? offset + page.count : null)
      || page.items.some((note) => !isPublicNote(note))) {
      throw new BlogApiError(502);
    }
    return { ...page, items: page.items.map((note) => presentNote(note)) };
  } catch (error) {
    if (error instanceof BlogConfigurationError) {
      console.warn("[博客] 请在服务端环境配置 NUBBI_API_TOKEN（通用 API 类型）。");
    } else if (error instanceof BlogApiError && [503, 504].includes(error.status)) {
      console.warn("[博客] 文章列表暂时不可用，本次按空数据展示。", { status: error.status });
    } else {
      throw error;
    }
    return {
      items: [],
      total: 0,
      count: 0,
      limit: PAGE_SIZE,
      offset: (filters.page - 1) * PAGE_SIZE,
      hasMore: false,
      nextOffset: null,
    };
  }
}

/**
 * 同一次服务端渲染复用元数据和页面的请求，不跨请求缓存正文。
 * @param id 路由传入的文章 ID。
 * @returns 公开文章；无效或不可公开的 ID 返回 null。
 */
export const getPost = cache(async (id: string): Promise<Post | null> => {
  if (!/^[a-f\d]{24}$/i.test(id)) return null;
  try {
    const query = new URLSearchParams({ noteId: id });
    const note = await requestBlogData(`detail?${query}`, noteDetailSchema.nullable());
    if (!note) return null;
    if (note._id.toLowerCase() !== id.toLowerCase()) throw new BlogApiError(502);
    if (!isPublicNote(note)) return null;
    return { ...presentNote(note, note.content), content: note.content };
  } catch (error) {
    if (error instanceof BlogApiError && error.status === 404) return null;
    throw error;
  }
});
