import type { ModelSettingsState } from "./use-model-settings-state.ts";
import { useCodexAccount } from "./use-codex-account.ts";
import { useCallback, useEffect, useState } from "react";

import { fetchProviderModels, getModelConfig, saveModelConfig } from "../../api.ts";

import type { ModelConfig } from "../../types.ts";

import { emptyModel, toHeaderPairs, fromHeaderPairs, type ModelHeader } from "./model-draft.ts";
/**
 * 管理模型设置的草稿、账号和保存操作。
 * @param baseUrl Assistant API 地址。
 * @param configAccessToken 配置管理密钥。
 * @returns 表单状态及操作。
 */
export function useModelSettings(baseUrl: string, configAccessToken: string): ModelSettingsState {
  const [config, setConfig] = useState(emptyModel);
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [headerPairs, setHeaderPairs] = useState<ModelHeader[]>([]);
  const [temperature, setTemperature] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [danger, setDanger] = useState(false);
  /**
   * 统一错误提示：写入 danger 状态与消息文案。
   * @param caught 捕获的异常。
   * @param fallback 无法提取消息时的兜底文案。
   * @returns 无返回值。
   */
  const report = (caught: unknown, fallback: string): void => {
    setDanger(true);
    setMessage(caught instanceof Error ? caught.message : fallback);
  };
  const receiveModels = useCallback((values: string[]): void => {
    setModels(values);
    setConfig((current) => ({ ...current, model: values.includes(current.model) ? current.model : values[0] || "" }));
  }, []);
  const { account, login, refreshCodex, beginLogin, signOut } = useCodexAccount({
    baseUrl,
    configAccessToken,
    receiveModels,
    feedback: { setBusy, setMessage, setDanger, report },
  });
  useEffect(() => {
    setBusy(true);
    void getModelConfig(baseUrl, configAccessToken)
      .then((value) => {
        setConfig(value);
        setHeaderPairs(toHeaderPairs(value.headers));
        setTemperature(value.temperature == null ? "" : String(value.temperature));
        if (value.provider === "codex-subscription") return refreshCodex();
        return undefined;
      })
      .catch((caught: unknown) => report(caught, "加载模型配置失败"))
      .finally(() => setBusy(false));
  }, [baseUrl, refreshCodex, configAccessToken]);
  /**
   * 拉取并展示 Provider 可用模型列表。
   * @returns 拉取完成后的 Promise。
   */
  const loadModels = async (): Promise<void> => {
    setBusy(true);
    setMessage("");
    try {
      if (config.provider === "codex-subscription") {
        if (!(await refreshCodex())) throw new Error("请先登录 ChatGPT");
      } else {
        if (!config.baseUrl.trim()) throw new Error("请先填写 Base URL");
        const result = await fetchProviderModels(baseUrl, configAccessToken, {
          baseUrl: config.baseUrl.trim(),
          apiKey: apiKey.trim() || undefined,
          headers: fromHeaderPairs(headerPairs),
        });
        setModels(result.models);
        if (!config.model && result.models[0]) setConfig({ ...config, model: result.models[0] });
      }
      setDanger(false);
      setMessage("模型列表已更新");
    } catch (caught) {
      report(caught, "获取模型失败");
    } finally {
      setBusy(false);
    }
  };
  /**
   * 保存模型配置；订阅模式固定为 ChatGPT 登录，API 模式固定为 api-key。
   * @returns 保存完成后的 Promise。
   */
  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const temperatureValue = temperature.trim() === "" ? undefined : Number(temperature);
      const saved = await saveModelConfig(baseUrl, configAccessToken, {
        provider: config.provider,
        contextWindow: config.contextWindow,
        authType: config.provider === "codex-subscription" ? "chatgpt" : "api-key",
        baseUrl: config.baseUrl.trim(),
        model: config.model.trim(),
        systemPrompt: config.systemPrompt,
        headers: fromHeaderPairs(headerPairs),
        temperature: temperatureValue === undefined || Number.isNaN(temperatureValue) ? undefined : temperatureValue,
        apiKey: apiKey.trim() || undefined,
        clearApiKey,
      });
      setConfig(saved);
      setApiKey("");
      setClearApiKey(false);
      setDanger(false);
      setMessage("模型配置已保存");
    } catch (caught) {
      report(caught, "保存失败");
    } finally {
      setBusy(false);
    }
  };
  /**
   * 切换 Provider 并重置模型列表；切到订阅模式时刷新 Codex。
   * @param provider 目标 Provider 类型。
   * @returns 无返回值。
   */
  const changeProvider = (provider: ModelConfig["provider"]): void => {
    setModels([]);
    setConfig({ ...config, provider, authType: provider === "codex-subscription" ? "chatgpt" : "api-key" });
    if (provider === "codex-subscription") void refreshCodex().catch((caught) => report(caught, "Codex 不可用"));
  };
  /**
   * 更新指定索引请求头的字段。
   * @param index 请求头在数组中的索引。
   * @param patch 要合并的字段更新。
   * @returns 无返回值。
   */
  const updateHeader = (index: number, patch: Partial<ModelHeader>): void => {
    setHeaderPairs((items) => items.map((item, candidate) => (candidate === index ? { ...item, ...patch } : item)));
  };
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
    models,
    account,
    login,
    busy,
    message,
    danger,
    beginLogin,
    signOut,
    loadModels,
    save,
    changeProvider,
    updateHeader,
  };
}
