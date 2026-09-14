import { useCallback, useEffect, useState } from "react";
import { fetchCodexModels, getCodexAccount, logoutCodex, startCodexLogin } from "../../platform/assistant-api.ts";
import type { CodexAccount, DeviceLogin } from "../../types.ts";
/** 账号面板所需的状态与动作。 */
export type CodexAccountState = {
  account: CodexAccount | null;
  login: DeviceLogin | null;
  loading: boolean;
  beginLogin: () => Promise<void>;
  signOut: () => Promise<void>;
};
/**
 * 管理订阅账号的加载、登录与轮询，界面组件不处理请求。
 * @param input 配置密钥及模型、提示更新回调。
 * @returns 账号状态及登录动作。
 */
export function useCodexAccount({
  configAccessToken,
  onModels,
  onMessage,
}: {
  configAccessToken: string;
  onModels: (models: string[]) => void;
  onMessage: (message: string) => void;
}): CodexAccountState {
  const [account, setAccount] = useState<CodexAccount | null>(null);
  const [login, setLogin] = useState<DeviceLogin | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 刷新账号与模型列表；已登录 ChatGPT 时返回 true。
   * @returns 是否已登录 ChatGPT。
   */
  const refresh = useCallback(async (): Promise<boolean> => {
    const next = await getCodexAccount(configAccessToken);
    setAccount(next);
    if (next.account?.type !== "chatgpt") return false;
    const result = await fetchCodexModels(configAccessToken);
    onModels(result.models.map((item) => item.model || item.id));
    setLogin(null);
    return true;
  }, [onModels, configAccessToken]);

  // 进入面板时读取一次账号状态。
  useEffect(() => {
    void refresh()
      .catch((error: unknown) => onMessage(error instanceof Error ? error.message : "Codex 不可用"))
      .finally(() => setLoading(false));
  }, [onMessage, refresh]);

  // 登录流程启动后轮询登录结果，直到 Codex 返回已登录。
  useEffect(() => {
    if (!login) return;
    const timer = window.setInterval(() => {
      void refresh()
        .then((done) => {
          if (done) onMessage("ChatGPT 登录成功");
        })
        .catch(() => undefined);
    }, 2_500);
    return () => window.clearInterval(timer);
  }, [login, onMessage, refresh]);

  /**
   * 发起设备码登录并在新标签页打开验证地址。
   * @returns 登录流程完成后的 Promise。
   */
  const beginLogin = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await startCodexLogin(configAccessToken);
      setLogin(result);
      window.open(result.verificationUrl, "_blank", "noopener,noreferrer");
      onMessage(`浏览器已打开，请输入代码 ${result.userCode}`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "无法开始登录");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 退出 ChatGPT 登录并清空模型列表。
   * @returns 退出完成后的 Promise。
   */
  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await logoutCodex(configAccessToken);
      setAccount({ account: null, requiresOpenaiAuth: true });
      onModels([]);
      onMessage("已退出 ChatGPT");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "退出登录失败");
    } finally {
      setLoading(false);
    }
  };

  return { account, login, loading, beginLogin, signOut };
}
