import { NubbiBrand } from "@/components/brand/NubbiBrand";
import { BookOpenText, FolderKanban, UsersRound } from "lucide-react";

const highlights = [
  {
    label: "记录",
    desc: "捕捉闪现的想法",
    icon: BookOpenText,
    iconClassName: "bg-[var(--entity-note-soft)] text-[var(--entity-note)]",
  },
  {
    label: "整理",
    desc: "让知识井井有条",
    icon: FolderKanban,
    iconClassName: "bg-[var(--entity-file-soft)] text-[var(--entity-file)]",
  },
  {
    label: "协作",
    desc: "与伙伴共同推进",
    icon: UsersRound,
    iconClassName: "bg-[var(--entity-meeting-soft)] text-[var(--entity-meeting)]",
  },
] as const;

/**
 * 渲染桌面认证页左侧品牌主视觉，严格承载已确认产品稿中的 mascot、口号、插画和能力提示。
 * @returns 登录、注册、验证和重置密码共用的桌面品牌面板。
 */
export function AuthBrandPanel() {
  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden border-r border-border-row bg-[#f7fbff] lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(120,176,255,0.22),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(255,219,154,0.22),transparent_30%)]" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center px-8 pt-[5.5vh] text-center xl:px-12 xl:pt-[6vh]">
        <NubbiBrand
          className="flex-col gap-2.5"
          markClassName="!size-[112px] xl:!size-[132px]"
          size="lg"
          wordmarkClassName="!text-[42px] !font-bold !tracking-[0.015em] xl:!text-[50px]"
        />

        <div className="mt-6 max-w-[600px]">
          <h1 className="text-[33px] font-semibold leading-[1.18] tracking-[-0.025em] text-text-primary xl:text-[39px]">
            Capture ideas.
            <br />
            <span className="text-[var(--brand)]">Brighten</span> your tomorrow.
          </h1>
          <p className="mt-4 text-[16px] leading-7 tracking-[0.04em] text-text-muted xl:text-[17px]">
            让重要的想法，在时间里发光。
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[48%] min-h-[360px] overflow-hidden">
        <img
          alt="Nubbi 灵感工作台插画"
          className="h-full w-full object-cover object-center"
          decoding="async"
          loading="eager"
          src="/brand/auth-scene.webp"
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f7fbff] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/90 via-white/65 to-transparent" />
      </div>

      <div className="absolute inset-x-7 bottom-7 z-20 grid grid-cols-3 gap-3 xl:inset-x-10 xl:bottom-8 xl:gap-4">
        {highlights.map(({ label, desc, icon: Icon, iconClassName }) => (
          <div
            className="flex min-w-0 items-center gap-3 rounded-[14px] border border-white/80 bg-white/84 px-3.5 py-3 text-left shadow-[0_10px_26px_rgba(74,101,142,0.08)] backdrop-blur-md xl:px-4"
            key={label}
          >
            <span className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${iconClassName}`}>
              <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.9} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-text-primary xl:text-[14px]">{label}</span>
              <span className="mt-0.5 block truncate text-[11px] text-text-subtle xl:text-[12px]">{desc}</span>
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
