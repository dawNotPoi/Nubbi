import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * 认证兼容区按钮。新业务仍应优先使用 `components/ui/button`；
 * 此处只保留旧调用 API，并与当前 Nubbi Token / 几何对齐。
 */
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium leading-none transition-[background-color,border-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-text-primary text-white hover:bg-[var(--text-primary-hover)] active:bg-[var(--text-primary-active)]",
        primary: "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]",
        destructive: "bg-[var(--danger-bg)] text-[var(--danger-text)] hover:bg-[var(--danger-hover)]",
        outline: "border border-border-button bg-surface text-text-primary hover:border-border-button-hover hover:bg-bg-hover",
        secondary: "bg-bg-selected text-text-primary hover:bg-bg-icon-hover",
        ghost: "text-text-muted hover:bg-bg-hover hover:text-text-primary",
        link: "text-[var(--brand)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 [&_svg]:size-4",
        sm: "h-10 rounded-control px-3 [&_svg]:size-4",
        lg: "h-11 rounded-control px-5 text-[15px] [&_svg]:size-[18px]",
        icon: "size-11 [&_svg]:size-[18px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
