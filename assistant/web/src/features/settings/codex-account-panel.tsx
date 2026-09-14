import { useCodexAccount } from "./use-codex-account.ts";
import { LogIn, LogOut } from "lucide-react";

import { Button } from "../../components/ui/button.tsx";

/**
 * ChatGPT 订阅账号面板：展示登录态、发起/退出设备码登录。
 * @param props.configAccessToken 配置管理密钥。
 * @param props.onModels 模型列表更新回调。
 * @param props.onMessage 提示文案回调。
 * @returns 订阅账号面板视图。
 */
export const CodexAccountPanel = ({
  configAccessToken,
  onModels,
  onMessage,
}: {
  configAccessToken: string;
  onModels: (models: string[]) => void;
  onMessage: (message: string) => void;
}): React.JSX.Element => {
  const { account, login, loading, beginLogin, signOut } = useCodexAccount({ configAccessToken, onModels, onMessage });
  const signedIn = account?.account?.type === "chatgpt";
  return (
    <div className="space-y-3 border-b pb-4">
      <div>
        <p className="text-sm font-semibold">
          {signedIn ? account.account?.email || "ChatGPT 已登录" : "尚未登录 ChatGPT"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {login ? (
            <>
              设备代码：<strong className="select-all text-foreground">{login.userCode}</strong>
            </>
          ) : signedIn ? (
            `订阅：${account.account?.planType || "可用"}`
          ) : (
            "凭据只保存在 Assistant API 所在设备"
          )}
        </p>
      </div>
      <Button
        className="w-full"
        disabled={loading}
        onClick={() => (signedIn ? void signOut() : void beginLogin())}
        type="button"
        variant="outline"
      >
        {signedIn ? (
          <>
            <LogOut />
            退出登录
          </>
        ) : (
          <>
            <LogIn />
            登录 ChatGPT
          </>
        )}
      </Button>
    </div>
  );
};
