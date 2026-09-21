import { NubbiBrand } from "@/components/brand/NubbiBrand";
import { Button } from "@/components/ui/button";
import { LoaderCircle, RotateCw } from "lucide-react";
import { useEffect, useRef, type ReactElement } from "react";

/** 身份确认页支持的状态。 */
export type AuthStatusScreenState = "checking" | "unavailable";

/** 身份确认页参数。 */
export interface AuthStatusScreenProps {
  state: AuthStatusScreenState;
  error?: string | null;
  retrying?: boolean;
  onRetry?: () => void | Promise<unknown>;
}

/**
 * 在既有认证卡片中展示身份确认或服务不可用状态。
 * @param props 状态、错误消息与真实重试动作。
 * @returns 不挂载业务页面骨架的认证状态内容。
 */
export function AuthStatusScreen({
  state,
  error,
  retrying = false,
  onRetry,
}: AuthStatusScreenProps): ReactElement {
  const checking = state === "checking";
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state === "unavailable") headingRef.current?.focus();
  }, [state]);

  return (
    <div className="auth-form">
      <header className="auth-card-header">
        <div className="auth-card-heading">
          <span className="auth-card-wordmark">NUBBI</span>
          <h1
            className="auth-card-title rounded-compact focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            ref={headingRef}
            tabIndex={-1}
          >
            {checking ? "正在确认登录状态" : "暂时无法确认登录状态"}
          </h1>
        </div>
        <p className="auth-card-description">
          {checking
            ? "正在安全地恢复你的会话，请稍候。"
            : "你的页面地址已保留，重新连接后可以继续。"}
        </p>
        <div aria-hidden="true" className="auth-card-mascot">
          <NubbiBrand
            markClassName="auth-card-mark"
            showWordmark={false}
            size="lg"
          />
        </div>
      </header>

      <div
        aria-live="polite"
        className="flex min-h-36 flex-col items-center justify-center gap-4 text-center"
        role={checking ? "status" : "alert"}
      >
        {checking ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-7 animate-spin text-[var(--brand)] motion-reduce:animate-none"
          />
        ) : (
          <>
            <p className="max-w-sm text-sm leading-6 text-text-muted">
              {error || "认证服务暂时不可用，请检查网络后重试。"}
            </p>
            <Button
              aria-busy={retrying || undefined}
              className="h-11 min-w-32"
              disabled={retrying || !onRetry}
              icon={<RotateCw aria-hidden="true" />}
              loading={retrying}
              onClick={() => void onRetry?.()}
              size="lg"
              variant="primary"
            >
              {retrying ? "正在重试" : "重新确认"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
