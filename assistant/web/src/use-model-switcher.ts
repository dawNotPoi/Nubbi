import { useCallback, useEffect, useState } from "react";
import {
  fetchCodexModels,
  fetchProviderModels,
  getCodexAccount,
  getModelConfig,
  saveModelConfig,
} from "./api";
import type { ModelConfig } from "./types";

/** 设置管理密钥在 sessionStorage 中的键名，与设置抽屉保持一致。 */
const TOKEN_KEY = "assistant-config-token";

/**
 * 聊天页的模型切换：读取当前模型配置、拉取可用模型列表并切换默认模型。
 * 切换只更新全局配置的 model 字段，下一次发送消息即生效。
 * @returns 模型切换所需的状态与操作（当前模型、模型列表、切换与刷新）。
 */
export const useModelSwitcher = () => {
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ChatGPT 订阅计划（仅订阅模式有值），供 /status 展示。
  const [planType, setPlanType] = useState<string | undefined>(undefined);

  /**
   * 重新读取配置与模型列表；未解锁时清空状态。
   * 模型列表拉取失败只清空列表，不阻塞配置展示。
   * @returns 刷新完成后的 Promise。
   */
  const refresh = useCallback(async () => {
    const accessToken = sessionStorage.getItem(TOKEN_KEY) ?? "";
    if (!accessToken) {
      setConfig(null);
      setModels([]);
      setPlanType(undefined);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await getModelConfig(accessToken);
      setConfig(next);
      try {
        if (next.provider === "codex-subscription") {
          const [account, modelResult] = await Promise.all([
            getCodexAccount(accessToken),
            fetchCodexModels(accessToken),
          ]);
          setModels(modelResult.models.map((item) => item.model || item.id));
          setPlanType(account.account?.type === "chatgpt" ? account.account.planType : undefined);
        } else {
          setPlanType(undefined);
          if (next.baseUrl.trim()) {
            const result = await fetchProviderModels(accessToken, {
              baseUrl: next.baseUrl.trim(),
            });
            setModels(result.models);
          } else {
            setModels([]);
          }
        }
      } catch {
        setModels([]);
        setPlanType(undefined);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "加载模型配置失败");
      if (caught instanceof Error && caught.message.includes("密钥无效")) {
        sessionStorage.removeItem(TOKEN_KEY);
        setConfig(null);
        setModels([]);
        setPlanType(undefined);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次挂载时读取一次配置与模型。
  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * 切换默认模型并保存配置；失败时写入 error 供界面提示。
   * @param model 目标模型 ID。
   * @returns 保存完成后的 Promise。
   */
  const switchModel = useCallback(async (model: string) => {
    if (!config) {
      setError("请先解锁配置");
      return;
    }
    const accessToken = sessionStorage.getItem(TOKEN_KEY) ?? "";
    if (!accessToken) {
      setError("请先解锁配置");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const saved = await saveModelConfig(accessToken, {
        provider: config.provider,
        authType: config.authType,
        baseUrl: config.baseUrl,
        model,
        systemPrompt: config.systemPrompt,
        headers: config.headers,
        temperature: config.temperature,
        contextWindow: config.contextWindow,
      });
      setConfig(saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "切换模型失败");
    } finally {
      setLoading(false);
    }
  }, [config]);

  return {
    config,
    models,
    currentModel: config?.model ?? "",
    planType,
    loading,
    error,
    unlocked: Boolean(sessionStorage.getItem(TOKEN_KEY)),
    refresh,
    switchModel,
  };
};
