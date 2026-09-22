import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactElement } from "react";

/** 右键菜单的受控状态容器。 */
export const ContextMenu = BaseContextMenu.Root;
/** 右键或长按触发区域，可通过 render 复用业务元素。 */
export const ContextMenuTrigger = BaseContextMenu.Trigger;

/**
 * 使用 Base UI 的定位与焦点管理渲染右键菜单。
 * @param props 菜单内容和样式。
 * @returns 传送到浮层的右键菜单内容。
 */
export function ContextMenuContent({ className, ...props }: ComponentProps<typeof BaseContextMenu.Popup>): ReactElement {
  return (
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner className="nubbi-menu-positioner">
        <BaseContextMenu.Popup {...props} className={cn("nubbi-menu-popup", className)} />
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  );
}

/**
 * 渲染普通或危险右键菜单动作。
 * @param props 菜单项内容、事件和危险状态。
 * @returns 支持键盘导航的菜单项。
 */
export function ContextMenuItem({ className, destructive = false, ...props }: ComponentProps<typeof BaseContextMenu.Item> & { destructive?: boolean }): ReactElement {
  return (
    <BaseContextMenu.Item
      {...props}
      data-destructive={destructive || undefined}
      className={cn("nubbi-menu-item", className)}
    />
  );
}

/**
 * 分隔不同语义的右键菜单动作组。
 * @param props 分隔线属性。
 * @returns 菜单分隔线。
 */
export function ContextMenuSeparator(props: ComponentProps<typeof BaseContextMenu.Separator>): ReactElement {
  return <BaseContextMenu.Separator {...props} className={cn("my-1 h-px bg-border-row", props.className)} />;
}
