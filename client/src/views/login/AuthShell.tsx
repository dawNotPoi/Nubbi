import { NubbiBrand } from "@/components/brand/NubbiBrand";
import type { PropsWithChildren, ReactElement } from "react";
import { AuthBrandPanel } from "./AuthBrandPanel";
import "./auth-shell.css";

/**
 * 为认证流程提供固定视口的响应式工作台背景，并保持既有认证表单状态与提交语义不变。
 * @param props 登录、注册、验证或重置密码等既有认证内容。
 * @returns Desktop 与 Mobile 均锁定在单屏视口内的认证布局。
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
      </div>

      <div className="auth-shell-layout relative z-10 mx-auto grid w-full max-w-[1480px] grid-cols-1 items-center gap-0 overflow-hidden px-3 sm:px-5 md:px-7 lg:grid-cols-[minmax(0,1fr)_minmax(420px,480px)] lg:gap-12 lg:px-12 xl:gap-16 xl:px-16">
        <AuthBrandPanel />

        <main className="auth-shell-main flex w-full min-w-0 justify-center lg:justify-end">
          <section className="auth-shell-card w-full max-w-[480px] rounded-[20px] border border-border-row bg-surface/95 px-4 py-4 shadow-[var(--shadow-popover)] backdrop-blur-md sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="auth-shell-card-brand mb-4 flex justify-center sm:mb-5">
              <NubbiBrand
                markClassName="!size-10 sm:!size-11"
                size="md"
                wordmarkClassName="!text-[20px] !font-semibold !tracking-[0.05em] sm:!text-[21px]"
              />
            </div>

            <div className="auth-shell-content">{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
