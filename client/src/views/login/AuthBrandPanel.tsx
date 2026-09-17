import { NubbiBrand } from "@/components/brand/NubbiBrand";
import { BookOpenText, FolderKanban, Sparkles } from "lucide-react";

const highlights = [
  { label: "记录灵感", icon: BookOpenText },
  { label: "整理资料", icon: FolderKanban },
  { label: "专注思考", icon: Sparkles },
] as const;

/**
 * 渲染桌面认证页左侧品牌叙事区，承载正式品牌插画与非交互式价值提示。
 * @returns 登录、注册、验证和重置密码共用的品牌面板。
 */
export function AuthBrandPanel() {
  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden border-r border-border-row bg-surface-subtle lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,var(--brand-soft),transparent_34%),radial-gradient(circle_at_84%_18%,var(--entity-folder-soft),transparent_28%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[56%] overflow-hidden">
        <img
          alt="Nubbi 灵感工作台插画"
          className="h-full w-full object-cover object-center"
          decoding="async"
          loading="eager"
          src="/brand/auth-scene.webp"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--surface-subtle),transparent_24%,transparent_80%,var(--surface-subtle))] opacity-45" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-10 py-9 xl:px-14 xl:py-11">
        <NubbiBrand size="md" />

        <div className="mt-[12vh] max-w-[560px]">
          <p className="text-[13px] font-medium tracking-[0.16em] text-text-subtle">
            CAPTURE · ORGANIZE · THINK
          </p>
          <h1 className="mt-5 max-w-[520px] text-[40px] font-semibold leading-[1.2] tracking-[-0.025em] text-text-primary xl:text-[48px]">
            让重要的想法，
            <br />
            在时间里发光。
          </h1>
          <p className="mt-5 max-w-[460px] text-[15px] leading-7 text-text-muted">
            记录、整理、思考，把今天零散的灵感变成明天可以继续推进的内容。
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {highlights.map(({ label, icon: Icon }) => (
              <span
                className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-border-row bg-surface/80 px-3 text-[13px] font-medium text-text-muted shadow-sm backdrop-blur"
                key={label}
              >
                <Icon aria-hidden="true" className="size-4 text-[var(--brand)]" strokeWidth={1.8} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto max-w-[420px] pb-[30vh] text-[13px] leading-6 text-text-subtle xl:pb-[28vh]">
          Capture ideas. Brighten your tomorrow.
        </div>
      </div>
    </aside>
  );
}
