import { Plus, Trash2 } from "lucide-react";
import type { KeyValuePair } from "./mcp-form-utils.ts";
import { Button } from "../../components/ui/button.tsx";

/**
 * 可增删的键值对编辑器，用于配置请求头等字典字段。
 * @param props.label 编辑器标题。
 * @param props.pairs 当前键值对数组。
 * @param props.onChange 键值对变化回调。
 * @returns 键值对编辑器视图。
 */
export const KeyValueEditor = ({
  label,
  pairs,
  onChange,
}: {
  label: string;
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
}): React.JSX.Element => {
  /**
   * 更新指定索引键值对的字段。
   * @param index 键值对在数组中的索引。
   * @param patch 要合并的字段更新。
   * @returns 无返回值。
   */
  const update = (index: number, patch: Partial<KeyValuePair>): void => {
    onChange(pairs.map((pair, candidate) => (candidate === index ? { ...pair, ...patch } : pair)));
  };

  return (
    <fieldset className="space-y-2">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-medium">{label}</legend>
        <Button
          aria-label={`添加${label}`}
          onClick={() => onChange([...pairs, { key: "", value: "" }])}
          size="icon"
          title={`添加${label}`}
          type="button"
          variant="ghost"
        >
          <Plus />
        </Button>
      </div>
      {pairs.map((pair, index) => (
        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_40px] gap-2" key={index}>
          <input
            aria-label={`${label}名称`}
            className="h-10 min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => update(index, { key: event.target.value })}
            placeholder="名称"
            value={pair.key}
          />
          <input
            aria-label={`${label}值`}
            className="h-10 min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => update(index, { value: event.target.value })}
            placeholder="值或 ${ENV_NAME}"
            value={pair.value}
          />
          <Button
            aria-label={`删除${label}`}
            onClick={() => onChange(pairs.filter((_, candidate) => candidate !== index))}
            size="icon"
            title={`删除${label}`}
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </fieldset>
  );
};
