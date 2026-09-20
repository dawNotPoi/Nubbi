import type { TrashSourceFilter } from "@/features/note-trash/model/trash";
import { Button, Input, Select } from "antd";
import { RefreshCw, Search } from "lucide-react";

type TrashToolbarProps = {
  disabled: boolean;
  filterText: string;
  refreshing: boolean;
  sourceFilter: TrashSourceFilter;
  total: number;
  onFilterTextChange: (value: string) => void;
  onRefresh: () => void;
  onSourceFilterChange: (value: TrashSourceFilter) => void;
};

export function TrashToolbar({
  disabled,
  filterText,
  onFilterTextChange,
  onRefresh,
  onSourceFilterChange,
  refreshing,
  sourceFilter,
  total,
}: TrashToolbarProps) {
  return (
    <div className="flex flex-col gap-2 border-y border-border-toolbar py-3 md:flex-row md:items-center">
      <Input
        allowClear
        className="h-11 min-w-0 flex-1 rounded-control md:h-8 md:max-w-sm md:rounded-compact"
        disabled={disabled}
        onChange={(event) => onFilterTextChange(event.target.value)}
        placeholder="搜索回收站标题"
        prefix={<Search className="size-4 text-text-subtle" />}
        value={filterText}
      />
      <div className="flex min-w-0 items-center gap-2">
        <Select
          className="h-11 min-w-0 flex-1 md:h-8 md:w-32 md:flex-none"
          disabled={disabled}
          onChange={onSourceFilterChange}
          options={[
            { label: "全部来源", value: "all" },
            { label: "我的笔记", value: "user" },
            { label: "Agent 笔记", value: "agent" },
          ]}
          value={sourceFilter}
        />
        <Button
          className="h-11 rounded-control md:h-8 md:rounded-compact"
          disabled={disabled}
          icon={<RefreshCw className="size-4" />}
          loading={refreshing}
          onClick={onRefresh}
        >
          <span className="hidden sm:inline">刷新</span>
        </Button>
        <span className="shrink-0 text-xs text-text-muted">{total} 项</span>
      </div>
    </div>
  );
}
