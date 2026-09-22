import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/lib/utils";
/** 页签受控状态容器。 */
export const Tabs = BaseTabs.Root;
/** @param props 列表内容与布局。 @returns 支持方向键导航的页签容器。 */
export function TabsList({ className, ...props }: ComponentProps<typeof BaseTabs.List>): ReactElement {
  return <BaseTabs.List {...props} className={cn("flex gap-1 overflow-x-auto border-b border-border-row", typeof className === "string" ? className : undefined)} />;
}
/** @param props 页签值及名称。 @returns 可键盘操作的页签按钮。 */
export function TabsTrigger({ className, ...props }: ComponentProps<typeof BaseTabs.Tab>): ReactElement {
  return <BaseTabs.Tab {...props} className={cn("min-h-10 shrink-0 border-b-2 border-transparent px-3 text-sm text-text-muted outline-none hover:bg-bg-hover data-active:border-primary data-active:text-text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring max-md:min-h-11", typeof className === "string" ? className : undefined)} />;
}
/** @param props 页签值与内容。 @returns 有可访问关联的内容面板。 */
export function TabsContent({ className, ...props }: ComponentProps<typeof BaseTabs.Panel>): ReactElement {
  return <BaseTabs.Panel {...props} className={cn("py-3 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring", typeof className === "string" ? className : undefined)} />;
}
