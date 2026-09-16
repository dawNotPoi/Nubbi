import Link from "next/link";
import type { ReactElement } from "react";
import { blogHref, type BlogFilters } from "../navigation";

const orders = [
  { value: "newest", label: "最新" },
  { value: "oldest", label: "最早" },
  { value: "updated", label: "最近更新" },
] as const;

/**
 * 排序与分页共用 URL 状态，切换顺序回到第一页。
 * @param props 当前文章总数与筛选状态。
 * @returns 列表计数和排序工具栏。
 */
export function PostToolbar({ total, filters }: { total: number; filters: BlogFilters }): ReactElement {
  return (
    <div className="post-toolbar">
      <span>共 {total} 篇</span>
      <nav aria-label="文章排序">
        {orders.map(({ value, label }) => (
          <Link key={value} href={blogHref({ ...filters, order: value, page: 1 })}
            aria-current={filters.order === value ? "true" : undefined}>{label}</Link>
        ))}
      </nav>
    </div>
  );
}
