import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "./input";
import { cn } from "@/lib/utils";

/**
 * 在共享输入框上提供可访问的密码显示切换。
 * @param props 除输入类型外的输入属性。
 * @param ref 输入元素引用。
 * @returns 密码输入框及显示切换按钮。
 */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(function PasswordInput({ className, disabled, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <Input {...props} ref={ref} disabled={disabled} type={visible ? "text" : "password"} className={cn("pl-3 pr-12", className)} />
    <button type="button" disabled={disabled} aria-label={visible ? "隐藏密码" : "显示密码"} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-control text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50">
      {visible ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
    </button>
  </div>;
});
