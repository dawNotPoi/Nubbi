import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[46px] w-full rounded-[10px] border border-[#ededeb] bg-[#f9f9f8] px-3.5 pl-[38px] text-sm text-text-primary placeholder:text-text-subtle transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium hover:border-[#d0d0d0] focus-visible:border-accent-foreground focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#eef3ff] focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50",
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
