import Form from "next/form";
import { Search } from "lucide-react";
import type { ReactElement } from "react";
import type { BlogFilters } from "../navigation";

/**
 * GET 搜索支持键盘、刷新和分享，提交后由 Next.js 提供导航加载反馈。
 * @param props 当前 URL 筛选状态。
 * @returns 文章标题与标签搜索表单。
 */
export function SearchForm({
  filters,
  inputId = "blog-search",
  onSubmit,
}: {
  filters: BlogFilters;
  inputId?: string;
  onSubmit?: () => void;
}): ReactElement {
  return (
    <Form action="/blog" className="search-form" role="search" onSubmit={onSubmit}>
      <label htmlFor={inputId} className="sr-only">
        搜索文章标题或标签
      </label>
      <Search size={18} aria-hidden="true" />
      <input
        id={inputId}
        name="q"
        type="search"
        placeholder="搜索"
        defaultValue={filters.q}
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
      />
      {filters.tag && <input type="hidden" name="tag" value={filters.tag} />}
      {filters.order !== "newest" && <input type="hidden" name="order" value={filters.order} />}
      <button type="submit" aria-label="搜索文章">↵</button>
    </Form>
  );
}
