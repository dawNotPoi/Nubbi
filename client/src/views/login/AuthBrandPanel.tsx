import { NubbiBrand } from "@/components/brand/NubbiBrand";
import { BookOpenText, FolderKanban, UsersRound } from "lucide-react";

const highlights = [
  {
    label: "记录",
    desc: "捕捉闪现的想法",
    icon: BookOpenText,
    iconClassName:
      "bg-[var(--entity-folder-soft)] text-[var(--entity-folder)]",
    placementClassName: "right-10 top-0",
  },
  {
    label: "整理",
    desc: "让知识井井有条",
    icon: FolderKanban,
    iconClassName: "bg-[var(--entity-file-soft)] text-[var(--entity-file)]",
    placementClassName: "bottom-0 left-7",
  },
  {
    label: "协作",
    desc: "与伙伴共同推进",
    icon: UsersRound,
    iconClassName:
      "bg-[var(--entity-meeting-soft)] text-[var(--entity-meeting)]",
    placementClassName: "bottom-5 right-0",
  },
] as const;

/**
 * 渲染认证页的品牌叙事层；桌面保留轻量能力提示，移动端只保留品牌与标题。
 * @returns 与整页工作台背景融合的 Nubbi 品牌内容。
 */
export function AuthBrandPanel() {
  return (
    <aside className="relative w-full pt-1 sm:pt-2 lg:min-h-[76vh] lg:pt-4">
      <div className="max-w-[650px]">
        <NubbiBrand
          markClassName="!size-10 sm:!size-11"
          size="md"
          wordmarkClassName="!text-[20px] !font-semibold !tracking-[0.04em] sm:!text-[22px]"
        />

        <div className="mt-7 sm:mt-10 lg:mt-[8vh]">
          <h1 className="max-w-[610px] text-[34px] font-semibold leading-[1.23] tracking-[-0.02em] text-text-primary sm:text-[42px] lg:text-[50px] xl:text-[56px]">
            让重要的想法，
            <br />
            在时间里发光。
          </h1>
          <p className="mt-4 text-[16px] font-medium tracking-[0.22em] text-text-primary sm:text-[18px]">
            记录 · 整理 · 思考
          </p>
          <p className="mt-3 text-[11px] font-medium tracking-[0.24em] text-text-muted sm:text-[12px]">
            CAPTURE IDEAS · BRIGHTEN YOUR TOMORROW
          </p>
        </div>

        <div className="relative mt-12 hidden h-44 max-w-[620px] lg:block xl:mt-14">
          {highlights.map(
            ({
              label,
              desc,
              icon: Icon,
              iconClassName,
              placementClassName,
            }) => (
              <div
                className={`absolute flex min-w-[188px] items-center gap-3 rounded-[14px] border border-border-row bg-surface/80 px-3.5 py-3 shadow-[var(--shadow-popover)] backdrop-blur-sm ${placementClassName}`}
                key={label}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${iconClassName}`}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-[18px]"
                    strokeWidth={1.9}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-text-primary">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-text-subtle">
                    {desc}
                  </span>
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </aside>
  );
}
