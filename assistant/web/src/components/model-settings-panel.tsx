import { KeyRound, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchProviderModels, getModelConfig, saveModelConfig } from "../api";
import type { ModelConfig } from "../types";
import { CodexAccountPanel } from "./codex-account-panel";
import { Button } from "./ui/button";

const emptyConfig = (): ModelConfig => ({
  provider: "openai-compatible",
  authType: "api-key",
  baseUrl: "",
  model: "",
  systemPrompt: "",
  apiKeyConfigured: false,
});

const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

export const ModelSettingsPanel = ({ token }: { token: string }) => {
  const [config, setConfig] = useState<ModelConfig>(emptyConfig);
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void getModelConfig(token)
      .then(setConfig)
      .catch((error: unknown) => setMessage(
        error instanceof Error ? error.message : "加载模型配置失败",
      ))
      .finally(() => setLoading(false));
  }, [token]);

  const receiveCodexModels = useCallback((values: string[]) => {
    setModels(values);
    setConfig((current) => ({
      ...current,
      model: values.includes(current.model) ? current.model : values[0] || "",
    }));
  }, []);

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

  const save = async (): Promise<void> => {
    setLoading(true);
    setMessage(null);
    try {
      const saved = await saveModelConfig(token, {
        provider: config.provider,
        authType: config.provider === "codex-subscription" ? "chatgpt" : "api-key",
        baseUrl: config.baseUrl.trim(),
        model: config.model,
        systemPrompt: config.systemPrompt,
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

  const changeProvider = (provider: ModelConfig["provider"]): void => {
    setModels([]);
    setConfig({ ...config, provider, authType: provider === "codex-subscription" ? "chatgpt" : "api-key" });
  };
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
        <>
          <label className="block space-y-1.5 text-sm font-medium">
            Base URL
            <input className={inputClass} onChange={(event) => setConfig({ ...config, baseUrl: event.target.value })} placeholder="https://api.example.com/v1" value={config.baseUrl} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            API Key
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
              <input autoComplete="off" className={`${inputClass} pl-9`} disabled={clearApiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={config.apiKeyConfigured ? "已保存，留空保持不变" : "sk-..."} type="password" value={apiKey} />
            </div>
          </label>
          {config.apiKeyConfigured ? (
            <label className="flex min-h-9 items-center gap-2 text-sm text-muted-foreground">
              <input checked={clearApiKey} className="size-4 accent-primary" onChange={(event) => setClearApiKey(event.target.checked)} type="checkbox" />
              清除已保存的 API Key
            </label>
          ) : null}
        </>
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
