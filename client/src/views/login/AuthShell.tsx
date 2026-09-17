import { NubbiBrand } from "@/components/brand/NubbiBrand";
import type { PropsWithChildren } from "react";
import { AuthBrandPanel } from "./AuthBrandPanel";

/**
 * 为认证流程提供统一的产品稿级响应式品牌外壳，并保持既有认证表单状态与提交语义不变。
 * @param props 登录、注册、验证或重置密码等既有认证内容。
 * @returns Desktop 产品稿双栏、Mobile 单栏的 Nubbi 认证布局。
 */
export function AuthShell({ children }: PropsWithChildren) {
  return (
    <div className="grid min-h-[100dvh] bg-[#f6f9ff] text-text-primary lg:grid-cols-[minmax(0,1fr)_minmax(520px,1fr)]">
      <AuthBrandPanel />

      <main className="relative flex min-h-[100dvh] min-w-0 items-center justify-center overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-10 xl:px-14 2xl:px-20">
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-[rgba(255,226,181,0.24)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-[22%] size-96 rounded-full bg-[rgba(138,184,255,0.16)] blur-3xl" />

        <section className="relative z-10 w-full max-w-[560px] rounded-[26px] border border-white/90 bg-white/94 px-5 py-7 shadow-[0_24px_70px_rgba(68,89,122,0.10)] backdrop-blur-sm sm:px-8 sm:py-9 lg:px-9 lg:py-10 xl:px-11">
          <div className="mb-7 flex justify-center sm:mb-8">
            <NubbiBrand
              className="flex-col gap-2"
              markClassName="!size-[68px] sm:!size-[76px]"
              size="lg"
              wordmarkClassName="!text-[26px] !font-bold !tracking-[0.05em] sm:!text-[29px]"
            />
          </div>

          <div className="[&>div]:!min-h-0 [&>div]:!bg-transparent [&>div]:!p-0 [&>div>div]:!w-full [&>div>div]:!max-w-none [&>div>div]:!border-0 [&>div>div]:!bg-transparent [&>div>div]:!p-0 [&>div>div]:!shadow-none [&_img]:hidden">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
