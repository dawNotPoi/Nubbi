import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils.ts";

/**
 * 输入框上方的模型选择器：展示当前模型并下拉切换。
 * 未解锁配置时按钮置灰并提示，解锁后展示可用模型列表。
 * @param props.currentModel 当前模型 ID。
 * @param props.models 可用模型 ID 列表。
 * @param props.loading 是否加载中。
 * @param props.error 加载/切换错误文案。
 * @param props.unlocked 是否已解锁配置管理。
 * @param props.onSwitch 切换模型回调，切换后自动关闭下拉。
 * @returns 模型选择器视图。
 */
export const ModelSwitcher = ({
  currentModel,
  models,
  loading,
  error,
  unlocked,
  onSwitch,
}: {
  currentModel: string;
  models: string[];
  loading: boolean;
  error: string | null;
  unlocked: boolean;
  onSwitch: (model: string) => Promise<void>;
}): React.JSX.Element => {
  const [open, setOpen] = useState(false);
  // 当前模型不在拉取到的列表里时仍保留为选项，避免切换后丢失。
  const options = currentModel && !models.includes(currentModel) ? [currentModel, ...models] : models;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          className="flex h-7 items-center gap-1.5 rounded-full border bg-background px-2.5 text-xs shadow-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          disabled={!unlocked}
          onClick={() => setOpen((value) => !value)}
          title={currentModel || "切换模型"}
          type="button"
        >
          <Sparkles className="size-3.5 shrink-0 text-primary" />
          <span className="max-w-44 truncate font-medium text-foreground">
            {currentModel || (unlocked ? "选择模型" : "未解锁模型切换")}
          </span>
          {unlocked ? (
            <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
          ) : null}
        </button>
        {open && unlocked ? (
          <>
            <button
              aria-label="关闭模型选择"
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setOpen(false)}
              type="button"
            />
            <div className="absolute bottom-full left-0 z-40 mb-2 max-h-72 w-64 overflow-y-auto rounded-xl border bg-background py-1 shadow-lg">
              <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">切换模型</p>
              {options.map((model) => (
                <button
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                    model === currentModel && "bg-muted",
                  )}
                  key={model}
                  onClick={() => {
                    setOpen(false);
                    void onSwitch(model);
                  }}
                  type="button"
                >
                  <span
                    className={cn("size-2 shrink-0 rounded-full", model === currentModel ? "bg-primary" : "bg-border")}
                  />
                  <span className="truncate">{model}</span>
                  {model === currentModel ? <span className="ml-auto text-xs text-muted-foreground">当前</span> : null}
                </button>
              ))}
              {!options.length ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {loading ? "正在加载…" : error || "未获取到模型列表，请到设置中配置模型"}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      {loading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
    </div>
  );
};
