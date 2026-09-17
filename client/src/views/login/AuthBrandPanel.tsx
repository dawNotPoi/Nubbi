import { NubbiBrand } from "@/components/brand/NubbiBrand";
import { BookOpenText, FolderKanban, UsersRound } from "lucide-react";
import type { ReactElement } from "react";

const highlights = [
  {
    label: "记录",
    icon: BookOpenText,
    iconClassName:
      "bg-[var(--entity-folder-soft)] text-[var(--entity-folder)]",
  },
  {
    label: "整理",
    icon: FolderKanban,
    iconClassName: "bg-[var(--entity-file-soft)] text-[var(--entity-file)]",
  },
  {
    label: "协作",
    icon: UsersRound,
    iconClassName:
      "bg-[var(--entity-meeting-soft)] text-[var(--entity-meeting)]",
  },
] as const;

/**
 * 渲染桌面认证页的品牌叙事层；移动端隐藏该层，把单屏空间优先留给认证表单。
 * @returns 与整页工作台背景融合的 Nubbi 品牌内容。
 */
export function AuthBrandPanel(): ReactElement {
  return (
    <aside className="auth-brand-panel hidden h-full min-h-0 w-full items-center justify-center lg:flex">
      <div className="flex w-full max-w-[620px] flex-col items-center text-center lg:pb-[5vh]">
        <NubbiBrand
          className="justify-center"
          markClassName="!size-10 sm:!size-11"
          size="md"
          wordmarkClassName="!text-[20px] !font-semibold !tracking-[0.04em] sm:!text-[22px]"
        />

        <div className="mt-7 flex w-full flex-col items-center sm:mt-9 lg:mt-10">
          <h1 className="mx-auto max-w-[560px] text-[34px] font-semibold leading-[1.23] tracking-[-0.02em] text-text-primary sm:text-[42px] lg:text-[48px] xl:text-[54px]">
            让重要的想法，
            <br />
            在时间里发光。
          </h1>
          <p className="mt-4 hidden text-[11px] font-medium tracking-[0.22em] text-text-muted sm:block sm:text-[12px]">
            CAPTURE IDEAS · BRIGHTEN YOUR TOMORROW
          </p>
        </div>

        <div className="mt-7 hidden flex-wrap items-center justify-center gap-2.5 lg:flex">
          {highlights.map(({ label, icon: Icon, iconClassName }) => (
            <div
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border-row bg-surface/82 px-3.5 text-[13px] font-medium text-text-primary shadow-[var(--shadow-popover)] backdrop-blur-sm"
              key={label}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full ${iconClassName}`}
              >
                <Icon
                  aria-hidden="true"
                  className="size-[15px]"
                  strokeWidth={1.9}
                />
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
