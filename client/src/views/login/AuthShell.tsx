import { NubbiBrand } from "@/components/brand/NubbiBrand";
import type { PropsWithChildren, ReactElement } from "react";
import { AuthBrandPanel } from "./AuthBrandPanel";

/**
 * 为认证流程提供统一的响应式工作台背景，并保持既有认证表单状态与提交语义不变。
 * @param props 登录、注册、验证或重置密码等既有认证内容。
 * @returns Desktop 单一场景背景与悬浮认证卡，Mobile 纵向裁切与可滚动认证卡。
 */
export function AuthShell({ children }: PropsWithChildren): ReactElement {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-surface-subtle text-text-primary">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        {/* 使用用户确认的原构图；移动端偏向笔记本裁切，不拉伸或重新生成场景。 */}
        <img
          alt=""
          className="h-full w-full object-cover object-[38%_center] sm:object-center"
          decoding="async"
          fetchPriority="high"
          height={941}
          loading="eager"
          src="/brand/auth-workspace-20260917.avif"
          width={1672}
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-[1480px] grid-cols-1 items-start gap-7 px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] sm:px-7 sm:py-8 md:px-9 lg:grid-cols-[minmax(0,1fr)_minmax(420px,480px)] lg:items-center lg:gap-12 lg:px-12 lg:py-10 xl:gap-16 xl:px-16">
        <AuthBrandPanel />

        <main className="flex w-full min-w-0 justify-center lg:justify-end">
          <section className="w-full max-w-[480px] rounded-[20px] border border-border-row bg-surface/95 px-5 py-6 shadow-[var(--shadow-popover)] backdrop-blur-md sm:px-7 sm:py-8 lg:px-8 lg:py-9">
            <div className="mb-5 flex justify-center sm:mb-6">
              <NubbiBrand
                markClassName="!size-10 sm:!size-11"
                size="md"
                wordmarkClassName="!text-[20px] !font-semibold !tracking-[0.05em] sm:!text-[21px]"
              />
            </div>

            <div className="[&>div]:!min-h-0 [&>div]:!bg-transparent [&>div]:!p-0 [&>div>div]:!w-full [&>div>div]:!max-w-none [&>div>div]:!border-0 [&>div>div]:!bg-transparent [&>div>div]:!p-0 [&>div>div]:!shadow-none [&_img]:hidden">
              {children}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
