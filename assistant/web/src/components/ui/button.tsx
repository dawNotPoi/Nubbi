import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/utils";

// 统一按钮样式变体：default / ghost / outline 与尺寸组合。
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        ghost: "hover:bg-muted",
        outline: "border border-border bg-background hover:bg-muted",
      },
      size: {
        default: "h-10 px-4 py-2",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * 通用按钮组件，支持 asChild 切换为任意元素。
 * @param props.className 自定义类名。
 * @param props.variant 按钮配色变体（default/ghost/outline）。
 * @param props.size 按钮尺寸（default/icon）。
 * @param props.asChild 为 true 时渲染为子元素而非 button。
 * @param props 其余原生按钮属性。
 * @param ref 转发的 DOM 引用。
 * @returns 按钮元素。
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
