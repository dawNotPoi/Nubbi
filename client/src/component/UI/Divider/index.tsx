import clsx from "clsx";
import React from "react";

type Props = {
  orientation?: "horizontal" | "vertical";
  inset?: "none" | "left" | "right" | "center" | number; // 数字表示 px 缩进
  dashed?: boolean;
  colorClass?: string; // eg. "border-slate-200"
  thickness?: string; // eg. "border"
  align?: "center" | "start" | "end";
  children?: React.ReactNode; // 可选文本
  className?: string;
};

export function Divider({
  orientation = "horizontal",
  inset = "none",
  dashed = false,
  colorClass = "border-slate-200",
  thickness = "border",
  align = "center",
  children,
  className,
}: Props) {
  if (orientation === "vertical" && children) {
    console.warn("Vertical divider does not support children text.");
  }

  const isV = orientation === "vertical";
  const insetStyle =
    typeof inset === "number"
      ? { marginLeft: inset, marginRight: inset }
      : undefined;

  if (!children || isV) {
    return (
      <div
        role="separator"
        aria-orientation={isV ? "vertical" : "horizontal"}
        aria-hidden={children ? undefined : true}
        className={clsx(
          isV
            ? `mx-2 self-stretch ${thickness} ${colorClass} ${
                dashed ? "border-dashed" : ""
              } border-l`
            : `my-2 ${thickness} ${colorClass} ${
                dashed ? "border-dashed" : ""
              } border-t`,
          inset === "left" && "ml-4",
          inset === "right" && "mr-4",
          inset === "center" && "mx-4",
          className
        )}
        style={insetStyle}
      />
    );
  }

  // 带文本的水平分隔
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={clsx("flex items-center gap-3 my-3", className)}
      style={insetStyle}
    >
      <span
        className={clsx("shrink min-w-0", align === "start" ? "w-2" : "w-full")}
      >
        <i
          className={clsx(
            "block border-t",
            thickness,
            colorClass,
            dashed && "border-dashed"
          )}
        />
      </span>
      <span className="text-xs text-slate-500 select-none">{children}</span>
      <span
        className={clsx("shrink min-w-0", align === "end" ? "w-2" : "w-full")}
      >
        <i
          className={clsx(
            "block border-t",
            thickness,
            colorClass,
            dashed && "border-dashed"
          )}
        />
      </span>
    </div>
  );
}
