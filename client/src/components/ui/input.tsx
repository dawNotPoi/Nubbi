import * as React from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

/** 原生输入框接口；保留 onChange 和 ref，兼容已有表单调用。 */
export type InputProps = Omit<
  React.ComponentPropsWithoutRef<typeof BaseInput>,
  "className" | "style" | "render"
> & {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * 封装 Base UI 输入框，视觉仅消费主题 Token。
 * @param props 输入属性；紧凑页面可通过 className 覆盖原有尺寸和图标预留空间。
 * @param ref 输入元素引用，用于原位编辑的聚焦及文本选择。
 * @returns 主题化输入框。
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, ...props },
  ref,
) {
  return (
    <BaseInput
      {...props}
      ref={ref}
      type={type}
      className={cn(
        "nubbi-input flex h-[34px] w-full rounded-[6px] border px-3 pl-9 text-sm font-normal file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
    />
  );
});
Input.displayName = "Input";

export { Input };
