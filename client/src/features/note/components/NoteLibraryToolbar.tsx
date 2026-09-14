import type { NoteStatus } from "@/api/note";
import type { NoteLibrarySortMode } from "@/features/note/model/library";
import type { MenuProps } from "antd";
import { Dropdown, Input, Select } from "antd";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowUpDown,
  Clock,
  Search,
  SlidersHorizontal,
} from "lucide-react";

const sortLabels: Record<NoteLibrarySortMode, string> = {
  "name-asc": "名称 A-Z",
  "name-desc": "名称 Z-A",
  "updated-desc": "最近修改",
  "updated-asc": "最早修改",
};

const sortIcons: Record<NoteLibrarySortMode, React.ReactNode> = {
  "name-asc": <ArrowDownAZ className="size-4" />,
  "name-desc": <ArrowUpAZ className="size-4" />,
  "updated-desc": <Clock className="size-4" />,
  "updated-asc": <Clock className="size-4" />,
};

const statusLabels: Record<"all" | NoteStatus, string> = {
  all: "All statuses",
  inbox: "Inbox",
  active: "Active",
  done: "Done",
  archived: "Archived",
};

const publishedLabels: Record<"all" | "published" | "unpublished", string> = {
  all: "All publish states",
  published: "Published",
  unpublished: "Unpublished",
};

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

export function NoteLibraryToolbar({
  availableTags,
  filterText,
  onFilterTextChange,
  onPublishedFilterChange,
  onSearchOpenChange,
  onSortModeChange,
  onStatusFilterChange,
  onTagsFilterChange,
  publishedFilter,
  searchOpen,
  sortMode,
  statusFilter,
  tagsFilter,
}: NoteLibraryToolbarProps) {
  const sortItems: MenuProps["items"] = (
    ["updated-desc", "updated-asc", "name-asc", "name-desc"] as NoteLibrarySortMode[]
  ).map((mode) => ({
    key: mode,
    icon: sortIcons[mode],
    label: sortLabels[mode],
    onClick: () => onSortModeChange(mode),
  }));
  const statusItems: MenuProps["items"] = (
    ["all", "inbox", "active", "done", "archived"] as Array<"all" | NoteStatus>
  ).map((status) => ({
    key: status,
    label: statusLabels[status],
    onClick: () => onStatusFilterChange(status),
  }));
  const publishedItems: MenuProps["items"] = (
    ["all", "published", "unpublished"] as Array<
      "all" | "published" | "unpublished"
    >
  ).map((state) => ({
    key: state,
    label: publishedLabels[state],
    onClick: () => onPublishedFilterChange(state),
  }));

  return (
    <div className="flex min-h-9 flex-wrap items-center justify-end gap-3">
      <div className="flex items-center gap-1 text-text-subtle">
        {(searchOpen || filterText) && (
          <Input
            allowClear
            autoFocus={searchOpen}
            className="h-8 w-[220px] rounded-md border-border-toolbar text-sm"
            onChange={(event) => onFilterTextChange(event.target.value)}
            onPressEnter={() => onSearchOpenChange(false)}
            placeholder="搜索页面"
            size="small"
            value={filterText}
          />
        )}
        <Dropdown menu={{ items: sortItems }} placement="bottomRight" trigger={["click"]}>
          <button
            className="flex size-8 items-center justify-center rounded text-text-subtle hover:bg-bg-hover hover:text-text-primary"
            title="排序"
            type="button"
          >
            <ArrowUpDown className="size-4" />
          </button>
        </Dropdown>
        <Dropdown menu={{ items: statusItems }} placement="bottomRight" trigger={["click"]}>
          <button
            className="h-8 rounded px-2 text-sm text-text-muted hover:bg-bg-hover hover:text-text-primary"
            title="Status filter"
            type="button"
          >
            {statusLabels[statusFilter]}
          </button>
        </Dropdown>
        <Dropdown menu={{ items: publishedItems }} placement="bottomRight" trigger={["click"]}>
          <button
            className="h-8 rounded px-2 text-sm text-text-muted hover:bg-bg-hover hover:text-text-primary"
            title="Publish filter"
            type="button"
          >
            {publishedLabels[publishedFilter]}
          </button>
        </Dropdown>
        {availableTags.length > 0 ? (
          <Select
            allowClear
            className="min-w-[120px]"
            maxTagCount={2}
            mode="multiple"
            onChange={onTagsFilterChange}
            options={availableTags.map(({ tag, count }) => ({
              label: `${tag} (${count})`,
              value: tag,
            }))}
            placeholder="标签筛选"
            size="small"
            style={{ height: 32 }}
            value={tagsFilter}
            variant="borderless"
          />
        ) : null}
        <button
          className="flex size-8 items-center justify-center rounded text-text-subtle hover:bg-bg-hover hover:text-text-primary"
          onClick={() => onSearchOpenChange(!searchOpen)}
          title="搜索"
          type="button"
        >
          <Search className="size-4" />
        </button>
        <Dropdown menu={{ items: sortItems }} placement="bottomRight" trigger={["click"]}>
          <button
            className="flex size-8 items-center justify-center rounded text-text-subtle hover:bg-bg-hover hover:text-text-primary"
            title={sortLabels[sortMode]}
            type="button"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </Dropdown>
      </div>
    </div>
  );
}
