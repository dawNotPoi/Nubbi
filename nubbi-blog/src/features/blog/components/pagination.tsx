import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactElement } from "react";
import { blogHref, MAX_PAGE, PAGE_SIZE, type BlogFilters } from "../navigation";

/**
 * 明确分页避免旧版无限滚动的重复请求，保留搜索和主题。
 * @param props 当前筛选和匹配文章总数。
 * @returns 分页导航，只有一页时不渲染。
 */
export function Pagination({
  filters,
  total,
}: {
  filters: BlogFilters;
  total: number;
}): ReactElement | null {
  const pages = Math.min(MAX_PAGE, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1 && filters.page === 1) return null;
  return (
    <nav className="pagination" aria-label="文章分页">
      {filters.page > 1 ? (
        <Link href={blogHref({ ...filters, page: filters.page - 1 })}>
          <ArrowLeft size={16} aria-hidden="true" />
          上一页
        </Link>
      ) : (
        <span aria-disabled="true">上一页</span>
      )}
      <span aria-current="page">
        第 {filters.page} 页，共 {Math.max(pages, 1)} 页
      </span>
      {filters.page < pages ? (
        <Link href={blogHref({ ...filters, page: filters.page + 1 })}>
          下一页
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span aria-disabled="true">下一页</span>
      )}
    </nav>
  );
}
