import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import type { ReactElement } from "react";

/** 登录卡片支持的第三方认证渠道。 */
export type SocialLoginProvider = "google" | "github";

interface SocialLoginButtonsProps {
  disabled: boolean;
  pendingProvider: SocialLoginProvider | null;
  onLogin: (provider: SocialLoginProvider) => Promise<void>;
}

/**
 * 保留 Google 品牌标识原色，避免将第三方身份误画为 Nubbi 业务图标。
 * @returns 不参与辅助技术朗读的 Google 标识。
 */
function GoogleMark(): ReactElement {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-7.95Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.8l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.87 0-5.3-1.94-6.17-4.54H2.15v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.83 13.96A6.6 6.6 0 0 1 5.48 12c0-.68.12-1.34.35-1.96V7.2H2.15A11 11 0 0 0 1 12c0 1.78.43 3.47 1.15 4.8l3.68-2.84Z" />
      <path fill="#EA4335" d="M12 5.5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.21 14.97 1 12 1a11 11 0 0 0-9.85 6.2l3.68 2.84C6.7 7.44 9.13 5.5 12 5.5Z" />
    </svg>
  );
}

/**
 * 用共享按钮呈现等权重的认证入口，仅当前渠道显示加载状态。
 * @param props 全局禁用状态、当前认证渠道和发起登录的回调。
 * @returns 支持键盘操作及窄屏布局的第三方登录按钮组。
 */
export function SocialLoginButtons({
  disabled,
  pendingProvider,
  onLogin,
}: SocialLoginButtonsProps): ReactElement {
  return (
    <div role="group" aria-label="第三方登录" className="grid grid-cols-2 gap-3">
      <Button
        variant="outline"
        className="min-h-12 w-full rounded-control"
        aria-label={pendingProvider === "google" ? "正在前往 Google" : "使用 Google 登录"}
        disabled={disabled || pendingProvider !== null}
        loading={pendingProvider === "google"}
        icon={<GoogleMark />}
        onClick={() => void onLogin("google")}
      >
        {pendingProvider === "google" ? "连接中…" : "Google"}
      </Button>
      <Button
        variant="outline"
        className="min-h-12 w-full rounded-control"
        aria-label={pendingProvider === "github" ? "正在等待 GitHub 登录" : "使用 GitHub 登录"}
        disabled={disabled || pendingProvider !== null}
        loading={pendingProvider === "github"}
        icon={<Github aria-hidden="true" />}
        onClick={() => void onLogin("github")}
      >
        {pendingProvider === "github" ? "等待登录…" : "GitHub"}
      </Button>
    </div>
  );
}
