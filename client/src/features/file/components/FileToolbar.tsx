import type { FileBreadcrumb, FileCategory } from "@/api/file";
import type { FileSortMode } from "@/features/file/model";
import {
  CATEGORY_OPTIONS,
  SORT_OPTIONS,
} from "@/features/file/model";
import { RefreshCw, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FileBreadcrumbs } from "./FileBreadcrumbs";

interface FileToolbarProps {
  activeUploads: number;
  breadcrumbs: FileBreadcrumb[];
  category: FileCategory;
  dragging: boolean;
  refreshing: boolean;
  search: string;
  sortMode: FileSortMode;
  onBreadcrumb: (item: FileBreadcrumb, index: number) => void;
  onCategoryChange: (value: FileCategory) => void;
  onDropFiles: (files: File[], folderId: string | null, folderName: string) => void;
  onDropItems: (item: FileBreadcrumb, index: number) => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: FileSortMode) => void;
  onTransferOpen: () => void;
}

export function FileToolbar(props: FileToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(Boolean(props.search));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const toggleSearch = () => {
    if (searchOpen && !props.search) setSearchOpen(false);
    else setSearchOpen(true);
  };

  return (
    <div className="mb-1 flex min-h-9 flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <FileBreadcrumbs
        dragging={props.dragging}
        items={props.breadcrumbs}
        onDropFiles={props.onDropFiles}
        onDropItems={props.onDropItems}
        onNavigate={props.onBreadcrumb}
      />
      <div className="flex min-w-0 items-center justify-end gap-1 overflow-x-auto">
        {searchOpen ? (
          <label className="relative min-w-[164px] flex-1 md:w-[220px] md:flex-none">
            <span className="sr-only">搜索当前目录</span>
            <input
              className="h-8 w-full rounded-md border border-border-toolbar bg-white px-2.5 pr-8 text-[13px] outline-none placeholder:text-text-placeholder focus:border-border-button-hover focus:ring-2 focus:ring-focus-ring"
              onChange={(event) => props.onSearchChange(event.target.value)}
              placeholder="搜索当前目录"
              ref={inputRef}
              type="search"
              value={props.search}
            />
            {props.search ? (
              <button
                aria-label="清空搜索"
                className="absolute right-1 top-1 grid size-6 place-items-center rounded text-text-subtle hover:bg-bg-icon-hover hover:text-text-primary"
                onClick={() => props.onSearchChange("")}
                type="button"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>
        ) : null}
        <button
          aria-label="搜索"
          className="file-tool-button"
          onClick={toggleSearch}
          type="button"
        >
          <Search className="size-4" />
        </button>
        <label className="min-[821px]:hidden">
          <span className="sr-only">排序方式</span>
          <select
            className="file-tool-select"
            onChange={(event) =>
              props.onSortChange(event.target.value as FileSortMode)
            }
            value={props.sortMode}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">文件类型</span>
          <select
            className="file-tool-select"
            onChange={(event) =>
              props.onCategoryChange(event.target.value as FileCategory)
            }
            value={props.category}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <button
          className="file-tool-button w-auto gap-1 px-2"
          onClick={props.onTransferOpen}
          type="button"
        >
          传输
          {props.activeUploads > 0 ? (
            <span className="grid min-w-[17px] place-items-center rounded-full bg-bg-selected px-1 text-[10px]">
              {props.activeUploads}
            </span>
          ) : null}
        </button>
        <button
          aria-label="刷新文件列表"
          className="file-tool-button"
          disabled={props.refreshing}
          onClick={props.onRefresh}
          type="button"
        >
          <RefreshCw className={props.refreshing ? "size-4 animate-spin" : "size-4"} />
        </button>
      </div>
    </div>
  );
}
