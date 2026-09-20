import { NubbiBrand } from "@/components/brand/NubbiBrand";
import type { ReactElement } from "react";

/**
 * 渲染桌面认证页的品牌叙事层；移动端隐藏该层，把单屏空间优先留给认证表单。
 * @returns 与整页工作台背景融合的 Nubbi 品牌内容。
 */
export function AuthBrandPanel(): ReactElement {
  return (
    <aside className="auth-brand-panel hidden h-full min-h-0 w-full items-center justify-center lg:flex">
      <div className="auth-brand-story">
        <NubbiBrand
          markClassName="!size-10"
          size="md"
          wordmarkClassName="!text-[20px] !font-semibold !tracking-[0.04em]"
        />

        <div className="mt-8">
          <p className="auth-brand-title">
            让重要的想法，
            <br />
            在时间里发光。
          </p>
          <p className="mt-5 text-[15px] leading-7 text-text-muted">
            记录此刻的灵感，慢慢整理成自己的世界。
          </p>
        </div>

        <p className="mt-7 flex items-center gap-3 text-[12px] tracking-[0.12em] text-text-muted">
          <span>记录</span><span aria-hidden="true">·</span>
          <span>整理</span><span aria-hidden="true">·</span><span>协作</span>
        </p>
      </div>
    </aside>
  );
}
