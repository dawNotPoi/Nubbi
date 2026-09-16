import type { NoteStatus } from "@/api/note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NoteLibrarySortMode } from "@/features/note/model/library";
import { Select } from "antd";
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown, Clock, Search, SlidersHorizontal, X } from "lucide-react";
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
 * 在原布局内替换基础控件；复杂标签 Select 留到下一阶段。
 * @param props 原笔记库控制器提供的状态及回调。
 * @returns 保留操作顺序和响应式行为的工具栏。
 */
export function NoteLibraryToolbar({
  availableTags, filterText, onFilterTextChange, onPublishedFilterChange,
  onSearchOpenChange, onSortModeChange, onStatusFilterChange, onTagsFilterChange,
  publishedFilter, searchOpen, sortMode, statusFilter, tagsFilter,
}: NoteLibraryToolbarProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? "排序";

  return (
    <div className="flex min-h-9 w-full items-center justify-start md:justify-end">
      <div className="flex w-full items-center gap-1 overflow-x-auto pb-1 text-text-subtle scrollbar-none md:w-auto md:pb-0">
        {(searchOpen || filterText) && (
          <div className="relative min-w-[180px] flex-1 md:w-[220px] md:flex-none">
            <Input
              ref={inputRef}
              aria-label="搜索页面"
              autoFocus={searchOpen}
              className="h-8 rounded-md border-border-toolbar bg-surface pl-2 pr-8"
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
                className="absolute right-0.5 top-0.5"
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  // 清空后保留输入框及焦点，防止组件被卸载导致键盘操作中断。
                  onSearchOpenChange(true);
                  onFilterTextChange("");
                  inputRef.current?.focus();
                }}
              >
                <X aria-hidden="true" className="size-3.5" />
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
            <Button variant="ghost" size="icon-sm" aria-label="排序" title="排序">
              <ArrowUpDown aria-hidden="true" className="size-4" />
            </Button>
          }
        />
        <NoteLibraryOptionMenu
          label="Status filter"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onValueChange={onStatusFilterChange}
          trigger={
            <Button variant="ghost" size="toolbar" className="font-normal" title="Status filter">
              {STATUS_LABELS[statusFilter]}
            </Button>
          }
        />
        <NoteLibraryOptionMenu
          label="Publish filter"
          value={publishedFilter}
          options={PUBLISHED_OPTIONS}
          onValueChange={onPublishedFilterChange}
          trigger={
            <Button variant="ghost" size="toolbar" className="font-normal" title="Publish filter">
              {PUBLISHED_LABELS[publishedFilter]}
            </Button>
          }
        />
        {availableTags.length > 0 ? (
          <Select
            allowClear
            aria-label="标签筛选"
            className="min-w-[120px]"
            maxTagCount={2}
            mode="multiple"
            onChange={onTagsFilterChange}
            options={availableTags.map(({ tag, count }) => ({ label: `${tag} (${count})`, value: tag }))}
            placeholder="标签筛选"
            size="small"
            style={{ height: 32 }}
            value={tagsFilter}
            variant="borderless"
          />
        ) : null}
        <Button
          variant="ghost" size="icon-sm" aria-label="搜索" title="搜索"
          aria-expanded={searchOpen || Boolean(filterText)}
          onClick={() => onSearchOpenChange(!searchOpen)}
        >
          <Search aria-hidden="true" className="size-4" />
        </Button>
        <NoteLibraryOptionMenu
          label={sortLabel}
          value={sortMode}
          options={SORT_OPTIONS}
          onValueChange={onSortModeChange}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={sortLabel} title={sortLabel}>
              <SlidersHorizontal aria-hidden="true" className="size-4" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
