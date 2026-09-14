import { KeyRound } from "lucide-react";
import type { ModelConfig } from "../../types.ts";
import { KeyValueEditor } from "./key-value-editor.tsx";
import type { KeyValuePair } from "./mcp-form-utils.ts";

const INPUT_CLASS =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/**
 * OpenAI 兼容 Provider 的表单：Base URL、API Key、采样温度、上下文窗口与自定义请求头。
 * @param props.config 当前模型配置。
 * @param props.apiKey API Key 输入值。
 * @param props.clearApiKey 是否清除已保存的 API Key。
 * @param props.temperature 采样温度输入值。
 * @param props.contextWindow 上下文窗口输入值。
 * @param props.headerPairs 自定义请求头键值对。
 * @param props.onPatch 局部更新模型配置回调。
 * @param props.onApiKeyChange API Key 变更回调。
 * @param props.onClearApiKeyChange 清除标记变更回调。
 * @param props.onTemperatureChange 温度变更回调。
 * @param props.onContextWindowChange 上下文窗口变更回调。
 * @param props.onHeaderPairsChange 请求头变更回调。
 * @returns 表单视图。
 */
export const OpenAiModelForm = ({
  config,
  apiKey,
  clearApiKey,
  temperature,
  contextWindow,
  headerPairs,
  onPatch,
  onApiKeyChange,
  onClearApiKeyChange,
  onTemperatureChange,
  onContextWindowChange,
  onHeaderPairsChange,
}: {
  config: ModelConfig;
  apiKey: string;
  clearApiKey: boolean;
  temperature: string;
  contextWindow: string;
  headerPairs: KeyValuePair[];
  onPatch: (patch: Partial<ModelConfig>) => void;
  onApiKeyChange: (value: string) => void;
  onClearApiKeyChange: (value: boolean) => void;
  onTemperatureChange: (value: string) => void;
  onContextWindowChange: (value: string) => void;
  onHeaderPairsChange: (value: KeyValuePair[]) => void;
}): React.JSX.Element => (
  <>
    <label className="block space-y-1.5 text-sm font-medium">
      Base URL
      <input
        className={INPUT_CLASS}
        onChange={(event) => onPatch({ baseUrl: event.target.value })}
        placeholder="https://api.example.com/v1"
        value={config.baseUrl}
      />
    </label>
    <label className="block space-y-1.5 text-sm font-medium">
      API Key
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
        <input
          autoComplete="off"
          className={`${INPUT_CLASS} pl-9`}
          disabled={clearApiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder={config.apiKeyConfigured ? "已保存，留空保持不变" : "sk-..."}
          type="password"
          value={apiKey}
        />
      </div>
    </label>
    {config.apiKeyConfigured ? (
      <label className="flex min-h-9 items-center gap-2 text-sm text-muted-foreground">
        <input
          checked={clearApiKey}
          className="size-4 accent-primary"
          onChange={(event) => onClearApiKeyChange(event.target.checked)}
          type="checkbox"
        />
        清除已保存的 API Key
      </label>
    ) : null}
    <label className="block space-y-1.5 text-sm font-medium">
      采样温度
      <input
        className={INPUT_CLASS}
        max={2}
        min={0}
        onChange={(event) => onTemperatureChange(event.target.value)}
        placeholder="默认 0.3，范围 0~2"
        step={0.1}
        type="number"
        value={temperature}
      />
    </label>
    <label className="block space-y-1.5 text-sm font-medium">
      上下文窗口（token）
      <input
        className={INPUT_CLASS}
        min={1024}
        onChange={(event) => onContextWindowChange(event.target.value)}
        placeholder="默认 128000，用于上下文占用百分比"
        step={1000}
        type="number"
        value={contextWindow}
      />
    </label>
    <KeyValueEditor label="自定义请求头" onChange={onHeaderPairsChange} pairs={headerPairs} />
  </>
);
