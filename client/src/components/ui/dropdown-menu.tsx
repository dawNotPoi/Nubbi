import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** 菜单状态容器；是否模态由调用方显式选择。 */
export const DropdownMenu = Menu.Root;
/** 使用 render 组合现有按钮，避免产生嵌套 button。 */
export const DropdownMenuTrigger = Menu.Trigger;
/** 单选菜单分组，复用 Base UI 的键盘导航及选择语义。 */
export const DropdownMenuRadioGroup = Menu.RadioGroup;

/** 浮层属性；定位与视觉属于共享组件，不泄漏到业务页面。 */
export type DropdownMenuContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof Menu.Popup>,
  "className"
> & {
  className?: string;
  align?: React.ComponentProps<typeof Menu.Positioner>["align"];
  sideOffset?: number;
};

/**
 * 将菜单传送到独立浮层并隔离点击冒泡，避免触发表格行的选择或打开。
 * @param props 弹层内容、对齐方式和可选事件回调。
 * @param ref 菜单弹层的 DOM 引用。
 * @returns 带定位、过渡和焦点管理的菜单浮层。
 */
export const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof Menu.Popup>,
  DropdownMenuContentProps
>(function DropdownMenuContent(
  { align = "end", sideOffset = 4, className, onClick, ...props },
  ref,
) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} sideOffset={sideOffset} className="nubbi-menu-positioner">
        <Menu.Popup
          {...props}
          ref={ref}
          className={cn("nubbi-menu-popup", className)}
          onClick={(event) => {
            event.stopPropagation();
            onClick?.(event);
          }}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

/** 菜单项属性；危险动作使用语义标记而非业务页面写色值。 */
export type DropdownMenuItemProps = Omit<
  React.ComponentPropsWithoutRef<typeof Menu.Item>,
  "className"
> & { className?: string; destructive?: boolean };

/**
 * 渲染普通或危险操作菜单项。
 * @param props 菜单项属性及危险动作标记。
 * @param ref 菜单项 DOM 引用。
 * @returns 可通过键盘和指针操作的菜单项。
 */
export const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof Menu.Item>,
  DropdownMenuItemProps
>(function DropdownMenuItem({ className, destructive = false, ...props }, ref) {
  return (
    <Menu.Item
      {...props}
      ref={ref}
      data-destructive={destructive || undefined}
      className={cn("nubbi-menu-item", className)}
    />
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

/** 单选菜单项属性，值及选择状态仍由 Base UI 分组管理。 */
export type DropdownMenuRadioItemProps = Omit<
  React.ComponentPropsWithoutRef<typeof Menu.RadioItem>,
  "className"
> & { className?: string };

/**
 * 渲染带选中标记的菜单项。
 * @param props 单选值、名称和内容。
 * @param ref 菜单项 DOM 引用。
 * @returns 可访问的单选菜单项。
 */
export const DropdownMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof Menu.RadioItem>,
  DropdownMenuRadioItemProps
>(function DropdownMenuRadioItem({ className, children, ...props }, ref) {
  return (
    <Menu.RadioItem {...props} ref={ref} className={cn("nubbi-menu-item", className)}>
      {children}
      <span className="ml-auto inline-flex size-4 shrink-0 items-center justify-center">
        <Menu.RadioItemIndicator>
          <Check aria-hidden="true" className="size-3.5" />
        </Menu.RadioItemIndicator>
      </span>
    </Menu.RadioItem>
  );
});
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";
