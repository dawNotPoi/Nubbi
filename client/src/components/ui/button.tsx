import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 按钮尺寸同时拥有 hit box 与 icon visual size，业务调用端不再修正内部 SVG 几何。
 */
const buttonVariants = cva(
  "nubbi-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium leading-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
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
        default: "h-8 px-3 [&_svg]:size-4",
        xs: "h-7 rounded-compact px-2 [&_svg]:size-[14px]",
        sm: "h-[30px] rounded-compact px-3 [&_svg]:size-4",
        toolbar: "h-8 rounded-compact px-2 [&_svg]:size-4",
        lg: "h-9 rounded-control px-4 [&_svg]:size-4",
        icon: "size-8 [&_svg]:size-4",
        "icon-sm": "size-[30px] rounded-compact [&_svg]:size-4",
        "icon-xs": "size-7 rounded-compact [&_svg]:size-[14px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, icon, children, disabled, type, ...props },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, className }));
  const unavailable = disabled || loading;

  if (asChild) {
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

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
