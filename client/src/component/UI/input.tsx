import * as React from "react"
import { cn } from "@/lib/utils"

/** 认证兼容区输入框；新业务优先使用 `components/ui/input`。 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-control border border-border-button bg-surface px-3 text-[15px] text-text-primary placeholder:text-text-placeholder transition-[background-color,border-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium hover:border-border-button-hover focus-visible:border-[var(--focus-border)] focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
