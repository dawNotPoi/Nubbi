import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/lib/utils";
/**
 * 提供共享开关的选中、键盘与焦点状态。
 * @param props Base UI 开关属性。
 * @returns 可访问的布尔开关。
 */
export function Switch({ className, ...props }: ComponentProps<typeof BaseSwitch.Root>): ReactElement {
  return <BaseSwitch.Root {...props} className={cn("inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-bg-selected p-0.5 outline-none data-checked:bg-primary focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50", typeof className === "string" ? className : undefined)}><BaseSwitch.Thumb className="size-5 rounded-full bg-surface shadow-sm transition-transform data-checked:translate-x-4 motion-reduce:transition-none" /></BaseSwitch.Root>;
}
