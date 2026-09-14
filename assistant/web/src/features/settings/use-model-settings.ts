import type { ModelSettingsState } from "./use-model-settings-state.ts";

import { useCallback, useEffect, useState } from "react";
import { fetchProviderModels, getModelConfig, saveModelConfig } from "../../platform/assistant-api.ts";
import type { ModelConfig } from "../../types.ts";

import { pairsToRecord, recordToPairs, type KeyValuePair } from "./mcp-form-utils.ts";

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

/**
 * 管理模型配置草稿、列表和保存操作。
 * @param configAccessToken 配置管理密钥。
 * @returns 模型设置状态及动作。
 */
export function useModelSettings(configAccessToken: string): ModelSettingsState {
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
    void getModelConfig(configAccessToken)
      .then((value) => {
        setConfig(value);
        setHeaderPairs(recordToPairs(value.headers));
        setTemperature(value.temperature == null ? "" : String(value.temperature));
        setContextWindow(value.contextWindow == null ? "" : String(value.contextWindow));
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "加载模型配置失败"))
      .finally(() => setLoading(false));
  }, [configAccessToken]);

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
      const result = await fetchProviderModels(configAccessToken, {
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
      const temperatureValue = temperature.trim() === "" ? undefined : Number(temperature);
      const contextWindowValue = contextWindow.trim() === "" ? undefined : Number(contextWindow);
      const saved = await saveModelConfig(configAccessToken, {
        provider: config.provider,
        authType: config.provider === "codex-subscription" ? "chatgpt" : "api-key",
        baseUrl: config.baseUrl.trim(),
        model: config.model,
        systemPrompt: config.systemPrompt,
        headers: pairsToRecord(headerPairs),
        temperature: temperatureValue === undefined || Number.isNaN(temperatureValue) ? undefined : temperatureValue,
        contextWindow:
          contextWindowValue === undefined || Number.isNaN(contextWindowValue) ? undefined : contextWindowValue,
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
  const modelOptions = config.model && !models.includes(config.model) ? [config.model, ...models] : models;

  return {
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
    models,
    loading,
    message,
    setMessage,
    receiveCodexModels,
    fetchModels,
    save,
    changeProvider,
    modelOptions,
  };
}
