import { TraceReasoningNode, TraceTextNode, TraceSkillNode } from "./trace-content-node.tsx";
import { TraceRunNode, TraceTokenNode, TraceEndNode } from "./trace-lifecycle-node.tsx";
import { TraceToolNode, TraceApprovalNode } from "./trace-tool-node.tsx";

import { TraceItem } from "./trace-types.ts";

import { XCircle } from "lucide-react";

/**
 * 轨迹时间线单条节点。
 * @param props.item 轨迹条目。
 * @returns 时间线节点视图。
 */
export const TraceNode = ({ item }: { item: TraceItem }): React.JSX.Element => {
  if (item.kind === "run") return <TraceRunNode item={item} />;
  if (item.kind === "reasoning") return <TraceReasoningNode item={item} />;
  if (item.kind === "text") return <TraceTextNode item={item} />;
  if (item.kind === "skill") return <TraceSkillNode item={item} />;
  if (item.kind === "tool") return <TraceToolNode item={item} />;
  if (item.kind === "approval") return <TraceApprovalNode item={item} />;
  if (item.kind === "token") return <TraceTokenNode item={item} />;
  if (item.kind === "end") return <TraceEndNode item={item} />;

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-600">
        <XCircle className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">错误</p>
        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{item.message}</p>
      </div>
    </div>
  );
};
