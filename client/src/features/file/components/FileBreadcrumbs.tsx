import type { FileBreadcrumb } from "@/api/file";
import { ChevronRight } from "lucide-react";

interface FileBreadcrumbsProps {
  items: FileBreadcrumb[];
  onNavigate: (item: FileBreadcrumb, index: number) => void;
}

export function FileBreadcrumbs({ items, onNavigate }: FileBreadcrumbsProps) {
  return (
    <nav
      aria-label="文件路径"
      className="flex min-w-0 items-center overflow-x-auto whitespace-nowrap text-[13px] text-text-muted scrollbar-none"
    >
      {items.map((item, index) => {
        const current = index === items.length - 1;
        return (
          <div className="flex shrink-0 items-center" key={item._id ?? "root"}>
            {index > 0 ? (
              <ChevronRight aria-hidden className="size-4 text-text-subtle" />
            ) : null}
            <button
              aria-current={current ? "page" : undefined}
              className="h-7 rounded px-1.5 text-left transition-colors hover:bg-bg-hover hover:text-text-primary disabled:cursor-default disabled:text-text-primary"
              disabled={current}
              onClick={() => onNavigate(item, index)}
              type="button"
            >
              {item.name}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
