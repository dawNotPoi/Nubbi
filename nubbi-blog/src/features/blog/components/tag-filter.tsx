import Link from "next/link";
import type { ReactElement } from "react";
import type { BlogTag } from "../api/contracts";
import { blogHref, type BlogFilters } from "../navigation";

/**
 * 标签是普通链接，保留关键词并在切换时重置分页。
 * @param props 公开标签以及当前筛选条件。
 * @returns 可横向滚动的主题筛选导航。
 */
export function TagFilter({
  tags,
  filters,
}: {
  tags: BlogTag[];
  filters: BlogFilters;
}): ReactElement {
  const visibleTags =
    filters.tag && !tags.some((tag) => tag.name === filters.tag)
      ? [{ name: filters.tag, count: 0 }, ...tags]
      : tags;
  return (
    <nav aria-label="按主题筛选" className="tag-filter">
      <Link
        href={blogHref({ q: filters.q, order: filters.order })}
        aria-current={!filters.tag ? "true" : undefined}
      >
        全部文章
      </Link>
      {visibleTags.map((tag) => (
        <Link
          key={tag.name}
          title={tag.name}
          href={blogHref({ q: filters.q, order: filters.order, tag: tag.name })}
          aria-current={filters.tag === tag.name ? "true" : undefined}
        >
          {tag.name}
          <span>({tag.count})</span>
        </Link>
      ))}
    </nav>
  );
}
