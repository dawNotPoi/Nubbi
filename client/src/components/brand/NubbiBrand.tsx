import { cn } from "@/lib/utils";

export type NubbiBrandProps = {
  className?: string;
  markClassName?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

const markSize = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
} as const;

const wordmarkSize = {
  sm: "text-[15px] tracking-[0.05em]",
  md: "text-[17px] tracking-[0.06em]",
  lg: "text-[22px] tracking-[0.08em]",
} as const;

/**
 * 渲染 Nubbi 的固定品牌组合，所有页面共享同一 mascot 资产与字标比例。
 * @param props 尺寸、显隐和外部样式覆盖。
 * @returns Nubbi mascot 与可选 NUBBI 字标组合。
 */
export function NubbiBrand({
  className,
  markClassName,
  size = "md",
  showWordmark = true,
  wordmarkClassName,
}: NubbiBrandProps) {
  return (
    <div
      aria-label="NUBBI"
      className={cn("inline-flex min-w-0 items-center gap-2.5", className)}
    >
      <img
        alt=""
        aria-hidden="true"
        className={cn("shrink-0 object-contain", markSize[size], markClassName)}
        height={size === "lg" ? 56 : size === "md" ? 40 : 32}
        src="/brand/nubbi-mascot.webp"
        width={size === "lg" ? 56 : size === "md" ? 40 : 32}
      />
      {showWordmark ? (
        <span
          className={cn(
            "truncate font-semibold leading-none text-text-primary",
            wordmarkSize[size],
            wordmarkClassName,
          )}
        >
          NUBBI
        </span>
      ) : null}
    </div>
  );
}
