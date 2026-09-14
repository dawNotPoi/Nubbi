import { TraceItem } from "./trace-types.ts";

import { ChevronDown, FileText, Sparkles } from "lucide-react";

/**
 * 展示 reasoning 轨迹节点。
 * @param props 节点数据。
 * @returns 对应视图。
 */
export const TraceReasoningNode = ({
  item,
}: {
  item: Extract<TraceItem, { kind: "reasoning" }>;
}): React.JSX.Element => {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600">
        <Sparkles className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <details>
          <summary className="cursor-pointer list-none text-sm font-medium">
            推理过程
            <ChevronDown className="ml-1 inline size-3.5 text-muted-foreground" />
          </summary>
          <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-xs leading-5 text-muted-foreground">
            {item.text}
          </p>
        </details>
      </div>
    </div>
  );
};
/**
 * 展示 text 轨迹节点。
 * @param props 节点数据。
 * @returns 对应视图。
 */
export const TraceTextNode = ({ item }: { item: Extract<TraceItem, { kind: "text" }> }): React.JSX.Element => {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-sky-500/10 text-sky-600">
        <FileText className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <details open>
          <summary className="cursor-pointer list-none text-sm font-medium">
            输出文本
            <ChevronDown className="ml-1 inline size-3.5 text-muted-foreground" />
          </summary>
          <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-xs leading-5 text-muted-foreground">
            {item.text}
          </p>
        </details>
      </div>
    </div>
  );
};
/**
 * 展示 skill 轨迹节点。
 * @param props 节点数据。
 * @returns 对应视图。
 */
export const TraceSkillNode = ({ item }: { item: Extract<TraceItem, { kind: "skill" }> }): React.JSX.Element => {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-600">
        <Sparkles className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.name}</p>
        {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
      </div>
    </div>
  );
};
