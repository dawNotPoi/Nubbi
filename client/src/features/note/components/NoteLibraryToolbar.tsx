import type { NoteStatus } from "@/api/note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NoteLibrarySortMode } from "@/features/note/model/library";
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown, Check, Clock, Search, Tags, X } from "lucide-react";
import { useRef, type ReactElement } from "react";
import { NoteLibraryOptionMenu, type NoteLibraryOption } from "./NoteLibraryOptionMenu";

const SORT_OPTIONS: readonly NoteLibraryOption<NoteLibrarySortMode>[] = [
  { value: "updated-desc", label: "最近修改", icon: <Clock className="size-4" /> },
  { value: "updated-asc", label: "最早修改", icon: <Clock className="size-4" /> },
  { value: "name-asc", label: "名称 A-Z", icon: <ArrowDownAZ className="size-4" /> },
  { value: "name-desc", label: "名称 Z-A", icon: <ArrowUpAZ className="size-4" /> },
];
const STATUS_LABELS: Record<"all" | NoteStatus, string> = {
  all: "All statuses", inbox: "Inbox", active: "Active", archived: "Archived",
};
const PUBLISHED_LABELS = {
  all: "All publish states", published: "Published", unpublished: "Unpublished",
} as const;
const STATUS_OPTIONS: readonly NoteLibraryOption<"all" | NoteStatus>[] = [
  { value: "all", label: STATUS_LABELS.all },
  { value: "inbox", label: STATUS_LABELS.inbox },
  { value: "active", label: STATUS_LABELS.active },
  { value: "archived", label: STATUS_LABELS.archived },
];
const PUBLISHED_OPTIONS: readonly NoteLibraryOption<keyof typeof PUBLISHED_LABELS>[] = [
  { value: "all", label: PUBLISHED_LABELS.all },
  { value: "published", label: PUBLISHED_LABELS.published },
  { value: "unpublished", label: PUBLISHED_LABELS.unpublished },
];

/** 笔记库工具栏契约；保留原控制器及所有筛选参数。 */
type NoteLibraryToolbarProps = {
  availableTags: { tag: string; count: number }[];
  filterText: string;
  publishedFilter: "all" | "published" | "unpublished";
  searchOpen: boolean;
  sortMode: NoteLibrarySortMode;
  statusFilter: "all" | NoteStatus;
  tagsFilter: string[];
  onFilterTextChange: (value: string) => void;
  onPublishedFilterChange: (value: "all" | "published" | "unpublished") => void;
  onSearchOpenChange: (open: boolean) => void;
  onSortModeChange: (mode: NoteLibrarySortMode) => void;
  onStatusFilterChange: (value: "all" | NoteStatus) => void;
  onTagsFilterChange: (tags: string[]) => void;
};

/**
 * 在原布局内替换基础控件；移动端允许筛选项自然换行，避免依赖横向滚动发现操作。
 * @param props 原笔记库控制器提供的状态及回调。
 * @returns 保留操作顺序和响应式行为的工具栏。
 */
export function NoteLibraryToolbar({
  availableTags, filterText, onFilterTextChange, onPublishedFilterChange,
  onSearchOpenChange, onSortModeChange, onStatusFilterChange, onTagsFilterChange,
  publishedFilter, searchOpen, sortMode, statusFilter, tagsFilter,
}: NoteLibraryToolbarProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex min-h-10 w-full items-center justify-start md:min-h-9 md:justify-end">
      <div className="flex w-full flex-wrap items-center gap-1.5 text-text-subtle md:w-auto md:flex-nowrap md:gap-1">
        {(searchOpen || filterText) && (
          <div className="relative w-full min-w-0 flex-none md:w-[220px]">
            <Input
              ref={inputRef}
              aria-label="搜索页面"
              autoFocus={searchOpen}
              className="h-10 rounded-control border-border-toolbar bg-surface pl-3 pr-10 text-[15px] md:h-8 md:rounded-control md:pl-2 md:pr-8 md:text-sm"
              onChange={(event) => onFilterTextChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  onSearchOpenChange(false);
                }
              }}
              placeholder="搜索页面"
              value={filterText}
            />
            {filterText && (
              <Button
                aria-label="清除搜索"
                className="absolute right-0 top-0 size-10 rounded-control md:right-0.5 md:top-0.5 md:size-7 md:rounded-compact"
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  // 清空后保留输入框及焦点，防止组件被卸载导致键盘操作中断。
                  onSearchOpenChange(true);
                  onFilterTextChange("");
                  inputRef.current?.focus();
                }}
              >
                <X aria-hidden="true" className="size-[18px] md:size-3.5" />
              </Button>
            )}
          </div>
        )}
        <NoteLibraryOptionMenu
          label="排序"
          value={sortMode}
          options={SORT_OPTIONS}
          onValueChange={onSortModeChange}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-10 rounded-control md:size-8 md:rounded-compact"
              aria-label="排序"
              title="排序"
            >
              <ArrowUpDown aria-hidden="true" className="size-[18px] md:size-4" />
            </Button>
          }
        />
        <NoteLibraryOptionMenu
          label="Status filter"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onValueChange={onStatusFilterChange}
          trigger={
            <Button
              variant="ghost"
              size="toolbar"
              className="h-10 shrink-0 rounded-control px-3 font-normal md:h-8 md:rounded-compact md:px-2"
              title="Status filter"
            >
              <span className="md:hidden">{statusFilter === "all" ? "状态" : STATUS_LABELS[statusFilter]}</span>
              <span className="hidden md:inline">{STATUS_LABELS[statusFilter]}</span>
            </Button>
          }
        />
        <NoteLibraryOptionMenu
          label="Publish filter"
          value={publishedFilter}
          options={PUBLISHED_OPTIONS}
          onValueChange={onPublishedFilterChange}
          trigger={
            <Button
              variant="ghost"
              size="toolbar"
              className="h-10 shrink-0 rounded-control px-3 font-normal md:h-8 md:rounded-compact md:px-2"
              title="Publish filter"
            >
              <span className="md:hidden">{publishedFilter === "all" ? "发布" : PUBLISHED_LABELS[publishedFilter]}</span>
              <span className="hidden md:inline">{PUBLISHED_LABELS[publishedFilter]}</span>
            </Button>
          }
        />
        {availableTags.length > 0 ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger render={
              <Button
                aria-label="标签筛选"
                className="h-10 shrink-0 rounded-control px-3 font-normal md:h-8 md:rounded-compact md:px-2"
                size="toolbar"
                variant="ghost"
              />
            }>
              <Tags aria-hidden="true" className="size-4" />
              <span>{tagsFilter.length > 0 ? `标签 ${tagsFilter.length}` : "标签"}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" aria-label="标签筛选">
              {availableTags.map(({ tag, count }) => {
                const selected = tagsFilter.includes(tag);
                return (
                  <DropdownMenuItem
                    key={tag}
                    closeOnClick={false}
                    onClick={() => onTagsFilterChange(
                      selected ? tagsFilter.filter((item) => item !== tag) : [...tagsFilter, tag],
                    )}
                  >
                    <span className="inline-flex size-4 items-center justify-center">
                      {selected ? <Check aria-hidden="true" className="size-3.5" /> : null}
                    </span>
                    <span>{tag} ({count})</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-10 rounded-control md:size-8 md:rounded-compact"
          aria-label="搜索"
          title="搜索"
          aria-expanded={searchOpen || Boolean(filterText)}
          onClick={() => onSearchOpenChange(!searchOpen)}
        >
          <Search aria-hidden="true" className="size-[18px] md:size-4" />
        </Button>
      </div>
    </div>
  );
}
