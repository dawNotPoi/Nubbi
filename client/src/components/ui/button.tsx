import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** 按钮视觉变体；Preview 先验证紧凑工具栏与克制圆角。 */
const buttonVariants = cva(
  "nubbi-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "nubbi-button-default",
        primary: "nubbi-button-primary",
        destructive: "nubbi-button-destructive",
        outline: "nubbi-button-outline",
        secondary: "nubbi-button-secondary",
        ghost: "nubbi-button-ghost",
        link: "nubbi-button-link underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3",
        xs: "h-7 rounded-[5px] px-2",
        sm: "h-[30px] rounded-[6px] px-3",
        toolbar: "h-8 rounded-[6px] px-2",
        lg: "h-9 rounded-[7px] px-4",
        icon: "size-8",
        "icon-sm": "size-[30px] rounded-[6px]",
        "icon-xs": "size-7 rounded-[5px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

/**
 * 项目自有按钮接口；asChild 仅兼容已有调用，不作为新代码的组合方式。
 * 链接使用原生链接及 buttonVariants，避免错误地覆盖链接语义。
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

/**
 * 为操作按钮统一主题与加载态；普通按钮由 Base UI 管理交互。
 * @param props 原生按钮属性、视觉变体及加载状态。
 * @param ref 供菜单触发器及调用方管理焦点的元素引用。
 * @returns 带主题的按钮；旧 asChild 调用保留 Slot 兼容分支。
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, icon, children, disabled, type, ...props },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, className }));
  const unavailable = disabled || loading;

  // 不改变旧 asChild 的 DOM 结构；新代码不应把 loading 或 icon 用在此兼容分支。
  if (asChild) {
    // Slot 转发原生属性到子元素，显式保留按钮属性类型而不放宽为 any。
    const slotProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
      ...props,
      disabled: unavailable,
      type,
    };
    return (
      <Slot
        {...slotProps}
        ref={ref}
        className={classes}
        aria-busy={loading || undefined}
      >
        {children}
      </Slot>
    );
  }

  return (
    <BaseButton
      {...props}
      ref={ref}
      type={type ?? "button"}
      className={classes}
      disabled={unavailable}
      focusableWhenDisabled={loading}
      aria-busy={loading || props["aria-busy"]}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
      ) : icon}
      {children}
    </BaseButton>
  );
});
Button.displayName = "Button";

// 保留已有导出，供链接和暂未迁移的页面消费样式。
// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
