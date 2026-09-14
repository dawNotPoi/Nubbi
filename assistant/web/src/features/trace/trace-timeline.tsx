import { TraceNode } from "./trace-node.tsx";

import { TraceItem } from "./trace-types.ts";

import { Activity } from "lucide-react";

/**
 * 轨迹时间线列表。
 * @param props.items 轨迹条目。
 * @returns 时间线视图。
 */
export const TraceTimeline = ({ items }: { items: TraceItem[] }): React.JSX.Element => (
  <div className="space-y-5 px-4 py-4">
    {items.map((item, index) => (
      <div className="relative pl-1" key={index}>
        {index < items.length - 1 ? (
          <span className="absolute left-[11px] top-7 bottom-[-14px] w-px bg-border" />
        ) : null}
        <TraceNode item={item} />
      </div>
    ))}
  </div>
);

/**
 * 空轨迹占位视图。
 * @returns 空状态提示。
 */
export const EmptyTrace = (): React.JSX.Element => (
  <div className="grid flex-1 place-items-center px-6 py-10">
    <div className="text-center">
      <Activity className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">暂无轨迹数据</p>
    </div>
  </div>
);
