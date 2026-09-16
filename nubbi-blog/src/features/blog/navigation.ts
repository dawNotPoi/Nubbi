/** 单页阅读列表保持适中长度，避免一次加载大量正文。 */
export const PAGE_SIZE = 10;
/** 与后端最大 offset 保持一致。 */
export const MAX_PAGE = 10_001;
/** 已标准化的列表查询状态，完全由 URL 驱动。 */
export type BlogFilters = { q: string; tag: string; page: number; order: "newest" | "oldest" | "updated" };
/** Next.js 服务端路由接收的查询值，包含重复参数情况。 */
export type SearchValues = Record<string, string | string[] | undefined>;

/**
 * 使用第一个参数值，防止重复参数改变查询类型。
 * @param value 原始查询值。
 * @returns 单个字符串。
 */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) || "";
}

/**
 * 将浏览器输入限制在后端支持的查询范围。
 * @param values Next.js 查询参数。
 * @returns 可安全构造 API 请求的筛选状态。
 */
export function parseFilters(values: SearchValues): BlogFilters {
  const page = Number(first(values.page));
  const order = first(values.order);
  return {
    q: first(values.q).trim().slice(0, 100),
    tag: first(values.tag).trim().slice(0, 50),
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1,
    order: order === "oldest" || order === "updated" ? order : "newest",
  };
}

/**
 * 所有筛选和分页链接通过同一入口编码，返回可分享的地址。
 * @param filters 需要保留的筛选状态。
 * @returns 博客列表地址。
 */
export function blogHref(filters: Partial<BlogFilters> = {}): string {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.tag) query.set("tag", filters.tag);
  if (filters.page && filters.page > 1) query.set("page", String(filters.page));
  if (filters.order && filters.order !== "newest") query.set("order", filters.order);
  return query.size ? `/blog?${query}` : "/blog";
}

/**
 * 只允许返回文章列表并重新规范筛选，防止回跳参数形成开放重定向。
 * @param value 阅读页携带的来源路径。
 * @returns 保留筛选和页码的本站列表地址。
 */
export function parseReturnTo(value: string | string[] | undefined): string {
  const path = first(value);
  if (!path.startsWith("/") || path.startsWith("//")) return "/blog";
  try {
    const url = new URL(path, "https://blog.invalid");
    if (
      url.origin !== "https://blog.invalid" ||
      !["/", "/blog"].includes(url.pathname)
    )
      return "/blog";
    return blogHref(parseFilters(Object.fromEntries(url.searchParams)));
  } catch {
    return "/blog";
  }
}
