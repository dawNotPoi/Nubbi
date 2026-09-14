import { RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchProviderModels, getModelConfig, saveModelConfig } from "../api";
import type { ModelConfig } from "../types";
import { CodexAccountPanel } from "./codex-account-panel";
import { OpenAiModelForm } from "./openai-model-form";
import {
  pairsToRecord,
  recordToPairs,
  type KeyValuePair,
} from "./mcp-form-utils";
import { Button } from "./ui/button";

/** 生成默认模型配置。@returns 全空的模型配置对象。 */
const emptyConfig = (): ModelConfig => ({
  provider: "openai-compatible",
  authType: "api-key",
  baseUrl: "",
  model: "",
  systemPrompt: "",
  headers: {},
  apiKeyConfigured: false,
});

const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/**
 * 模型设置面板：切换 Provider、配置 API Key 或 ChatGPT 登录、选择模型与系统提示词。
 * @param props.token 配置管理密钥。
 * @returns 模型设置面板视图。
 */
export const ModelSettingsPanel = ({ token }: { token: string }) => {
  const [config, setConfig] = useState<ModelConfig>(emptyConfig);
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [headerPairs, setHeaderPairs] = useState<KeyValuePair[]>([]);
  const [temperature, setTemperature] = useState("");
  const [contextWindow, setContextWindow] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void getModelConfig(token)
      .then((value) => {
        setConfig(value);
        setHeaderPairs(recordToPairs(value.headers));
        setTemperature(value.temperature == null ? "" : String(value.temperature));
        setContextWindow(value.contextWindow == null ? "" : String(value.contextWindow));
      })
      .catch((error: unknown) => setMessage(
        error instanceof Error ? error.message : "加载模型配置失败",
      ))
      .finally(() => setLoading(false));
  }, [token]);

  /**
   * 接收 Codex 模型列表并同步到配置。
   * @param values Codex 模型 ID 列表。
   * @returns 无返回值。
   */
  const receiveCodexModels = useCallback((values: string[]) => {
    setModels(values);
    setConfig((current) => ({
      ...current,
      model: values.includes(current.model) ? current.model : values[0] || "",
    }));
  }, []);

  /**
   * 拉取并展示 Provider 可用模型列表。
   * @returns 拉取完成后的 Promise。
   */
  const fetchModels = async (): Promise<void> => {
    if (!config.baseUrl.trim()) {
      setMessage("请先填写 Base URL");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await fetchProviderModels(token, {
        baseUrl: config.baseUrl.trim(),
        apiKey: apiKey.trim() || undefined,
        headers: pairsToRecord(headerPairs),
      });
      setModels(result.models);
      if (!config.model && result.models[0]) {
        setConfig((current) => ({ ...current, model: result.models[0] ?? "" }));
      }
      setMessage(`已获取 ${result.models.length} 个模型`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "获取模型失败");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存模型配置；订阅模式固定为 ChatGPT 登录，API 模式固定为 api-key。
   * @returns 保存完成后的 Promise。
   */
  const save = async (): Promise<void> => {
    setLoading(true);
    setMessage(null);
    try {
      const temperatureValue =
        temperature.trim() === "" ? undefined : Number(temperature);
      const contextWindowValue =
        contextWindow.trim() === "" ? undefined : Number(contextWindow);
      const saved = await saveModelConfig(token, {
        provider: config.provider,
        authType: config.provider === "codex-subscription" ? "chatgpt" : "api-key",
        baseUrl: config.baseUrl.trim(),
        model: config.model,
        systemPrompt: config.systemPrompt,
        headers: pairsToRecord(headerPairs),
        temperature:
          temperatureValue === undefined || Number.isNaN(temperatureValue)
            ? undefined
            : temperatureValue,
        contextWindow:
          contextWindowValue === undefined || Number.isNaN(contextWindowValue)
            ? undefined
            : contextWindowValue,
        apiKey: apiKey.trim() || undefined,
        clearApiKey,
      });
      setConfig(saved);
      setApiKey("");
      setClearApiKey(false);
      setMessage("模型配置已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存模型配置失败");
    } finally {
      setLoading(false);
    }
  };

  /** 切换 Provider 并重置模型列表。 */
  const changeProvider = (provider: ModelConfig["provider"]): void => {
    setModels([]);
    setConfig({ ...config, provider, authType: provider === "codex-subscription" ? "chatgpt" : "api-key" });
  };
  // 当前已选模型不在拉取到的列表中时，仍保留它作为选项，避免保存时丢失。
  const modelOptions = config.model && !models.includes(config.model)
    ? [config.model, ...models]
    : models;

  return (
    <div className="space-y-5 px-4 py-4">
      <div className="grid grid-cols-2 rounded-md bg-muted p-1">
        <button className={`h-9 rounded-md text-sm font-medium ${config.provider === "openai-compatible" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => changeProvider("openai-compatible")} type="button">API Key</button>
        <button className={`h-9 rounded-md text-sm font-medium ${config.provider === "codex-subscription" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => changeProvider("codex-subscription")} type="button">ChatGPT 订阅</button>
      </div>

      {config.provider === "codex-subscription" ? (
        <CodexAccountPanel onMessage={setMessage} onModels={receiveCodexModels} token={token} />
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
          <label className="text-sm font-medium" htmlFor="model-select">模型</label>
          {config.provider === "openai-compatible" ? <Button disabled={loading} onClick={() => void fetchModels()} size="icon" title="获取模型" type="button" variant="ghost"><RefreshCw /></Button> : null}
        </div>
        {modelOptions.length ? (
          <select className={inputClass} id="model-select" onChange={(event) => setConfig({ ...config, model: event.target.value })} value={config.model}>
            <option value="">选择模型</option>
            {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        ) : <input className={inputClass} id="model-select" onChange={(event) => setConfig({ ...config, model: event.target.value })} placeholder="模型 ID" value={config.model} />}
      </div>

      <label className="block space-y-1.5 text-sm font-medium">
        系统提示词
        <textarea className="min-h-28 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" onChange={(event) => setConfig({ ...config, systemPrompt: event.target.value })} value={config.systemPrompt} />
      </label>
      {message ? <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}
      <Button className="w-full" disabled={loading} onClick={() => void save()} type="button"><Save />保存模型配置</Button>
    </div>
  );
};
