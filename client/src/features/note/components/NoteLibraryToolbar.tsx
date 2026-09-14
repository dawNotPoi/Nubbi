import type { NoteStatus } from "@/api/note";
import type { NoteLibrarySortMode } from "@/features/note/model/library";
import type { MenuProps } from "antd";
import { Dropdown, Input } from "antd";
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
  filterText: string;
  publishedFilter: "all" | "published" | "unpublished";
  searchOpen: boolean;
  sortMode: NoteLibrarySortMode;
  statusFilter: "all" | NoteStatus;
  onFilterTextChange: (value: string) => void;
  onPublishedFilterChange: (value: "all" | "published" | "unpublished") => void;
  onSearchOpenChange: (open: boolean) => void;
  onSortModeChange: (mode: NoteLibrarySortMode) => void;
  onStatusFilterChange: (value: "all" | NoteStatus) => void;
};

export function NoteLibraryToolbar({
  filterText,
  onFilterTextChange,
  onPublishedFilterChange,
  onSearchOpenChange,
  onSortModeChange,
  onStatusFilterChange,
  publishedFilter,
  searchOpen,
  sortMode,
  statusFilter,
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
      <div className="flex items-center gap-1 text-[#9b9a97]">
        {(searchOpen || filterText) && (
          <Input
            allowClear
            autoFocus={searchOpen}
            className="h-8 w-[220px] rounded-md border-[#e3e2df] text-sm"
            onChange={(event) => onFilterTextChange(event.target.value)}
            onPressEnter={() => onSearchOpenChange(false)}
            placeholder="搜索页面"
            size="small"
            value={filterText}
          />
        )}
        <Dropdown menu={{ items: sortItems }} placement="bottomRight" trigger={["click"]}>
          <button
            className="flex size-8 items-center justify-center rounded text-[#9b9a97] hover:bg-[#f7f7f5] hover:text-[#37352f]"
            title="排序"
            type="button"
          >
            <ArrowUpDown className="size-4" />
          </button>
        </Dropdown>
        <Dropdown menu={{ items: statusItems }} placement="bottomRight" trigger={["click"]}>
          <button
            className="h-8 rounded px-2 text-sm text-[#787774] hover:bg-[#f7f7f5] hover:text-[#37352f]"
            title="Status filter"
            type="button"
          >
            {statusLabels[statusFilter]}
          </button>
        </Dropdown>
        <Dropdown menu={{ items: publishedItems }} placement="bottomRight" trigger={["click"]}>
          <button
            className="h-8 rounded px-2 text-sm text-[#787774] hover:bg-[#f7f7f5] hover:text-[#37352f]"
            title="Publish filter"
            type="button"
          >
            {publishedLabels[publishedFilter]}
          </button>
        </Dropdown>
        <button
          className="flex size-8 items-center justify-center rounded text-[#9b9a97] hover:bg-[#f7f7f5] hover:text-[#37352f]"
          onClick={() => onSearchOpenChange(!searchOpen)}
          title="搜索"
          type="button"
        >
          <Search className="size-4" />
        </button>
        <Dropdown menu={{ items: sortItems }} placement="bottomRight" trigger={["click"]}>
          <button
            className="flex size-8 items-center justify-center rounded text-[#9b9a97] hover:bg-[#f7f7f5] hover:text-[#37352f]"
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
