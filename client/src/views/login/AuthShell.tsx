import { NubbiBrand } from "@/components/brand/NubbiBrand";
import type { PropsWithChildren } from "react";
import { AuthBrandPanel } from "./AuthBrandPanel";

/**
 * 为认证流程提供统一的响应式品牌外壳，业务表单本身保持原有状态与提交语义。
 * @param props 登录、注册、验证或重置密码等既有认证内容。
 * @returns Desktop 双栏、Mobile 单栏的 Nubbi 认证布局。
 */
export function AuthShell({ children }: PropsWithChildren) {
  return (
    <div className="grid min-h-[100dvh] bg-surface text-text-primary lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]">
      <AuthBrandPanel />
      <main className="relative flex min-h-[100dvh] min-w-0 items-center justify-center overflow-y-auto bg-surface px-4 py-8 sm:px-8 lg:px-10 xl:px-16">
        <div className="w-full max-w-[440px]">
          <div className="mb-7 flex justify-center lg:hidden">
            <NubbiBrand size="md" />
          </div>
          <div className="[&>div]:!min-h-0 [&>div]:!bg-transparent [&>div]:!p-0 [&>div]:sm:!p-0 [&_img]:hidden">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
