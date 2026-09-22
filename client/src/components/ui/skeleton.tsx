import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib/utils";
/**
 * 为尚未加载的内容提供低对比度占位。
 * @param props 占位布局属性。
 * @returns 不参与朗读的骨架块。
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
  return <div {...props} aria-hidden="true" className={cn("min-h-4 animate-pulse rounded-compact bg-bg-selected motion-reduce:animate-none", className)} />;
}
