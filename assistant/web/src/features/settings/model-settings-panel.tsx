import { useModelSettings } from "./use-model-settings.ts";
import { RefreshCw, Save } from "lucide-react";

import { CodexAccountPanel } from "./codex-account-panel.tsx";
import { OpenAiModelForm } from "./openai-model-form.tsx";

import { Button } from "../../components/ui/button.tsx";

const inputClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/**
 * 模型设置面板：切换 Provider、配置 API Key 或 ChatGPT 登录、选择模型与系统提示词。
 * @param props.configAccessToken 配置管理密钥。
 * @returns 模型设置面板视图。
 */
export const ModelSettingsPanel = ({ configAccessToken }: { configAccessToken: string }): React.JSX.Element => {
  const {
    config,
    setConfig,
    apiKey,
    setApiKey,
    clearApiKey,
    setClearApiKey,
    headerPairs,
    setHeaderPairs,
    temperature,
    setTemperature,
    contextWindow,
    setContextWindow,
    loading,
    message,
    setMessage,
    receiveCodexModels,
    fetchModels,
    save,
    changeProvider,
    modelOptions,
  } = useModelSettings(configAccessToken);

  return (
    <div className="space-y-5 px-4 py-4">
      <div className="grid grid-cols-2 rounded-md bg-muted p-1">
        <button
          className={`h-9 rounded-md text-sm font-medium ${config.provider === "openai-compatible" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
          onClick={() => changeProvider("openai-compatible")}
          type="button"
        >
          API Key
        </button>
        <button
          className={`h-9 rounded-md text-sm font-medium ${config.provider === "codex-subscription" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
          onClick={() => changeProvider("codex-subscription")}
          type="button"
        >
          ChatGPT 订阅
        </button>
      </div>

      {config.provider === "codex-subscription" ? (
        <CodexAccountPanel onMessage={setMessage} onModels={receiveCodexModels} configAccessToken={configAccessToken} />
      ) : (
        <OpenAiModelForm
          apiKey={apiKey}
          clearApiKey={clearApiKey}
          config={config}
          contextWindow={contextWindow}
          headerPairs={headerPairs}
          onApiKeyChange={setApiKey}
          onClearApiKeyChange={setClearApiKey}
          onContextWindowChange={setContextWindow}
          onHeaderPairsChange={setHeaderPairs}
          onPatch={(patch) => setConfig((current) => ({ ...current, ...patch }))}
          onTemperatureChange={setTemperature}
          temperature={temperature}
        />
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" htmlFor="model-select">
            模型
          </label>
          {config.provider === "openai-compatible" ? (
            <Button
              disabled={loading}
              onClick={() => void fetchModels()}
              size="icon"
              title="获取模型"
              type="button"
              variant="ghost"
            >
              <RefreshCw />
            </Button>
          ) : null}
        </div>
        {modelOptions.length ? (
          <select
            className={inputClass}
            id="model-select"
            onChange={(event) => setConfig({ ...config, model: event.target.value })}
            value={config.model}
          >
            <option value="">选择模型</option>
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={inputClass}
            id="model-select"
            onChange={(event) => setConfig({ ...config, model: event.target.value })}
            placeholder="模型 ID"
            value={config.model}
          />
        )}
      </div>

      <label className="block space-y-1.5 text-sm font-medium">
        系统提示词
        <textarea
          className="min-h-28 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          onChange={(event) => setConfig({ ...config, systemPrompt: event.target.value })}
          value={config.systemPrompt}
        />
      </label>
      {message ? <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}
      <Button className="w-full" disabled={loading} onClick={() => void save()} type="button">
        <Save />
        保存模型配置
      </Button>
    </div>
  );
};
