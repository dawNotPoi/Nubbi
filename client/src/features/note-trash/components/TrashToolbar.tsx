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
    <div className="flex flex-col gap-2 border-y border-border-toolbar py-3 sm:flex-row sm:items-center">
      <Input
        allowClear
        className="min-w-0 flex-1 sm:max-w-sm"
        disabled={disabled}
        onChange={(event) => onFilterTextChange(event.target.value)}
        placeholder="搜索回收站标题"
        prefix={<Search className="size-4 text-text-subtle" />}
        value={filterText}
      />
      <div className="flex min-w-0 items-center gap-2">
        <Select
          className="min-w-0 flex-1 sm:w-32 sm:flex-none"
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
          disabled={disabled}
          icon={<RefreshCw className="size-4" />}
          loading={refreshing}
          onClick={onRefresh}
        >
          刷新
        </Button>
        <span className="shrink-0 text-xs text-text-muted">{total} 项</span>
      </div>
    </div>
  );
}
