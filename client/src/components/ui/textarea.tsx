import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * 多行输入沿用共享输入框的焦点与错误状态。
 * @param props 原生多行输入属性。
 * @param ref 输入元素引用。
 * @returns 主题化多行输入框。
 */
export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} {...props} className={cn("nubbi-input min-h-24 w-full rounded-control border px-3 py-2 text-sm disabled:opacity-50", className)} />;
});
