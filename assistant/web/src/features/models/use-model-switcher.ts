import type { ModelSwitcherState } from "./use-model-switcher-state.ts";
import { readConfigAccessToken, saveConfigAccessToken } from "../../platform/config-access-storage.ts";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCodexModels, fetchProviderModels, getCodexAccount, getModelConfig } from "../../platform/assistant-api.ts";
import type { ModelConfig } from "../../types.ts";

/**
 * 加载默认连接与可选模型；会话模型由聊天状态保存，不写全局配置。
 * @returns 配置与模型目录，供新会话和选择器使用。
 */
export const useModelSwitcher = (): ModelSwitcherState => {
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string | undefined>(undefined);
  const refreshRevision = useRef(0);

  /**
   * 读取配置与模型目录，过期请求和卸载后的回调不更新状态。
   * @returns 刷新完成的 Promise。
   */
  const refresh = useCallback(async (): Promise<void> => {
    const revision = ++refreshRevision.current;
    const accessToken = readConfigAccessToken() ?? "";
    setModels([]);
    setPlanType(undefined);
    setError(null);
    if (!accessToken) {
      setConfig(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await getModelConfig(accessToken);
      if (revision !== refreshRevision.current) return;
      setConfig(next);
      try {
        if (next.provider === "codex-subscription") {
          const [account, result] = await Promise.all([getCodexAccount(accessToken), fetchCodexModels(accessToken)]);
          if (revision !== refreshRevision.current) return;
          setModels(result.models.map((item) => item.model || item.id));
          setPlanType(account.account?.type === "chatgpt" ? account.account.planType : undefined);
        } else if (next.baseUrl.trim()) {
          const result = await fetchProviderModels(accessToken, { baseUrl: next.baseUrl.trim() });
          if (revision === refreshRevision.current) setModels(result.models);
        }
      } catch {
        // 目录查询失败不影响已配置模型继续使用。
      }
    } catch (caught) {
      if (revision !== refreshRevision.current) return;
      setConfig(null);
      setError(caught instanceof Error ? caught.message : "加载模型配置失败");
      if (caught instanceof Error && caught.message.includes("密钥无效")) saveConfigAccessToken("");
    } finally {
      if (revision === refreshRevision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => { refreshRevision.current += 1; };
  }, [refresh]);

  return { config, models, planType, loading, error, unlocked: Boolean(readConfigAccessToken()), refresh };
};
