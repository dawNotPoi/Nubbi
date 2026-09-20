import type { PropsWithChildren, ReactElement } from "react";
import { AuthBrandPanel } from "./AuthBrandPanel";
import "./auth-shell.css";

/**
 * 为认证流程提供工作台背景与可滚动的便签卡片，保持认证提交语义不变。
 * @param props 登录、注册、验证或重置密码等既有认证内容。
 * @returns 桌面分栏、移动端单卡片的认证布局。
 */
export function AuthShell({ children }: PropsWithChildren): ReactElement {
  return (
    <div className="auth-shell relative w-full bg-surface-subtle text-text-primary">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        {/* 使用用户确认的高质量工作台背景；移动端偏向笔记本裁切，不拉伸场景。 */}
        <img
          alt=""
          className="h-full w-full object-cover object-[38%_center] sm:object-center"
          decoding="async"
          fetchPriority="high"
          height={941}
          loading="eager"
          src="/brand/auth-workspace-hq.webp"
          width={1672}
        />
        <div className="absolute inset-0 bg-canvas/15" />
      </div>

      <div className="auth-shell-layout relative z-10 mx-auto grid w-full max-w-[1480px] grid-cols-1 items-center gap-0 px-3 sm:px-5 md:px-7 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] lg:gap-12 lg:px-12 xl:gap-16 xl:px-16">
        <AuthBrandPanel />

        <main className="auth-shell-main flex w-full min-w-0 justify-center lg:justify-end">
          <section className="auth-shell-card w-full max-w-[440px]">
            <div className="auth-shell-content">{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
