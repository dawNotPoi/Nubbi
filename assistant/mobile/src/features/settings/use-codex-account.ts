import type { CodexAccountState } from "./use-codex-account-state.ts";
import { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";
import { fetchCodexModels, getCodexAccount, logoutCodex, startCodexLogin } from "../../api.ts";

import type { CodexAccount, DeviceLogin } from "../../types.ts";

/** 账号动作的 UI 反馈，不依赖具体面板。 */
type AccountFeedback = {
  setBusy: (value: boolean) => void;
  setMessage: (value: string) => void;
  setDanger: (value: boolean) => void;
  report: (error: unknown, fallback: string) => void;
};
/**
 * 管理 Codex 账号和设备码登录。
 * @param input 服务连接、模型接收函数和 UI 反馈。
 * @returns 账号、登录状态和操作。
 */
export function useCodexAccount({
  baseUrl,
  configAccessToken,
  receiveModels,
  feedback,
}: {
  baseUrl: string;
  configAccessToken: string;
  receiveModels: (models: string[]) => void;
  feedback: AccountFeedback;
}): CodexAccountState {
  const [account, setAccount] = useState<CodexAccount | null>(null);
  const [login, setLogin] = useState<DeviceLogin | null>(null);
  const { setBusy, setMessage, setDanger, report } = feedback;

  /**
   * 刷新 Codex 登录态与模型列表；已登录返回 true。
   * @returns 是否已登录 ChatGPT。
   */
  const refreshCodex = useCallback(async (): Promise<boolean> => {
    const nextAccount = await getCodexAccount(baseUrl, configAccessToken);
    setAccount(nextAccount);
    if (nextAccount.account?.type !== "chatgpt") return false;
    const result = await fetchCodexModels(baseUrl, configAccessToken);
    const values = result.models.map((item) => item.model || item.id);
    receiveModels(values);
    setLogin(null);
    return true;
  }, [baseUrl, configAccessToken, receiveModels]);

  /**
   * 发起 Codex 设备码登录并在浏览器打开验证页。
   * @returns 登录流程完成后的 Promise。
   */
  const beginLogin = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await startCodexLogin(baseUrl, configAccessToken);
      setLogin(result);
      await Linking.openURL(result.verificationUrl);
      setDanger(false);
      setMessage(`浏览器已打开，请输入代码 ${result.userCode}`);
    } catch (caught) {
      report(caught, "无法开始登录");
    } finally {
      setBusy(false);
    }
  };

  /**
   * 退出 ChatGPT 登录并清空模型列表。
   * @returns 退出完成后的 Promise。
   */
  const signOut = async (): Promise<void> => {
    setBusy(true);
    try {
      await logoutCodex(baseUrl, configAccessToken);
      setAccount({ account: null, requiresOpenaiAuth: true });
      receiveModels([]);
      setMessage("已退出 ChatGPT");
      setDanger(false);
    } catch (caught) {
      report(caught, "退出登录失败");
    } finally {
      setBusy(false);
    }
  };
  // 登录流程启动后轮询登录结果，直到 Codex 返回已登录。
  useEffect(() => {
    if (!login) return;
    const timer = setInterval(() => {
      void refreshCodex()
        .then((done) => {
          if (done) {
            setDanger(false);
            setMessage("ChatGPT 登录成功");
          }
        })
        .catch(() => undefined);
    }, 2_500);
    return () => clearInterval(timer);
  }, [login, refreshCodex]);

  return { account, login, refreshCodex, beginLogin, signOut };
}
