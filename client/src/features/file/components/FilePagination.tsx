import { ChevronLeft, ChevronRight } from "lucide-react";

interface FilePaginationProps {
  count: number;
  hasMore: boolean;
  limit: number;
  offset: number;
  pending: boolean;
  total: number;
  onChange: (offset: number) => void;
}

export function FilePagination({
  count,
  hasMore,
  limit,
  offset,
  pending,
  total,
  onChange,
}: FilePaginationProps) {
  if (total === 0) return null;
  const start = offset + 1;
  const end = offset + count;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <footer className="flex items-center justify-between gap-3 border-t border-border-row py-3 text-xs text-text-muted">
      <span className="hidden sm:inline">{start}–{end} / {total}</span>
      <span className="sm:hidden">{page} / {pages}</span>
      <div className="flex items-center gap-1">
        <button
          aria-label="上一页"
          className="file-page-button"
          disabled={pending || offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
          type="button"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">上一页</span>
        </button>
        <button
          aria-label="下一页"
          className="file-page-button"
          disabled={pending || !hasMore}
          onClick={() => onChange(offset + limit)}
          type="button"
        >
          <span className="hidden sm:inline">下一页</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </footer>
  );
}
