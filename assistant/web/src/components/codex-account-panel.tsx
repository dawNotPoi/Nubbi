import { LogIn, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  fetchCodexModels,
  getCodexAccount,
  logoutCodex,
  startCodexLogin,
} from "../api";
import type { CodexAccount, DeviceLogin } from "../types";
import { Button } from "./ui/button";

/** ChatGPT 订阅账号面板：展示登录态、发起/退出设备码登录。 */
export const CodexAccountPanel = ({
  token,
  onModels,
  onMessage,
}: {
  token: string;
  onModels: (models: string[]) => void;
  onMessage: (message: string) => void;
}) => {
  const [account, setAccount] = useState<CodexAccount | null>(null);
  const [login, setLogin] = useState<DeviceLogin | null>(null);
  const [loading, setLoading] = useState(true);

  /** 刷新账号与模型列表；已登录 ChatGPT 时返回 true。 */
  const refresh = useCallback(async (): Promise<boolean> => {
    const next = await getCodexAccount(token);
    setAccount(next);
    if (next.account?.type !== "chatgpt") return false;
    const result = await fetchCodexModels(token);
    onModels(result.models.map((item) => item.model || item.id));
    setLogin(null);
    return true;
  }, [onModels, token]);

  // 进入面板时读取一次账号状态。
  useEffect(() => {
    void refresh().catch((error: unknown) => onMessage(
      error instanceof Error ? error.message : "Codex 不可用",
    )).finally(() => setLoading(false));
  }, [onMessage, refresh]);

  // 登录流程启动后轮询登录结果，直到 Codex 返回已登录。
  useEffect(() => {
    if (!login) return;
    const timer = window.setInterval(() => {
      void refresh().then((done) => {
        if (done) onMessage("ChatGPT 登录成功");
      }).catch(() => undefined);
    }, 2_500);
    return () => window.clearInterval(timer);
  }, [login, onMessage, refresh]);

  const beginLogin = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await startCodexLogin(token);
      setLogin(result);
      window.open(result.verificationUrl, "_blank", "noopener,noreferrer");
      onMessage(`浏览器已打开，请输入代码 ${result.userCode}`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "无法开始登录");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await logoutCodex(token);
      setAccount({ account: null, requiresOpenaiAuth: true });
      onModels([]);
      onMessage("已退出 ChatGPT");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "退出登录失败");
    } finally {
      setLoading(false);
    }
  };

  const signedIn = account?.account?.type === "chatgpt";
  return (
    <div className="space-y-3 border-b pb-4">
      <div>
        <p className="text-sm font-semibold">
          {signedIn ? account.account?.email || "ChatGPT 已登录" : "尚未登录 ChatGPT"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {login
            ? <>设备代码：<strong className="select-all text-foreground">{login.userCode}</strong></>
            : signedIn ? `订阅：${account.account?.planType || "可用"}` : "凭据只保存在 Assistant API 所在设备"}
        </p>
      </div>
      <Button
        className="w-full"
        disabled={loading}
        onClick={() => signedIn ? void signOut() : void beginLogin()}
        type="button"
        variant="outline"
      >
        {signedIn ? <><LogOut />退出登录</> : <><LogIn />登录 ChatGPT</>}
      </Button>
    </div>
  );
};
