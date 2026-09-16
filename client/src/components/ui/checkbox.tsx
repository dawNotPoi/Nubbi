import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Base UI 的布尔选中接口；半选由独立的 indeterminate 属性表达。 */
export type CheckboxProps = Omit<
  React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root>,
  "className" | "children"
> & { className?: string };

/**
 * 统一单选、全选和半选样式，不在组件内部复制业务选中状态。
 * @param props 复选框状态、可访问名称及变更回调。
 * @param ref 复选框根元素引用。
 * @returns 带选中或半选指示器的复选框。
 */
export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof BaseCheckbox.Root>,
  CheckboxProps
>(function Checkbox({ className, indeterminate = false, ...props }, ref) {
  return (
    <BaseCheckbox.Root
      {...props}
      ref={ref}
      indeterminate={indeterminate}
      className={cn("nubbi-checkbox", className)}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center">
        {indeterminate ? (
          <Minus aria-hidden="true" className="size-3" strokeWidth={2.5} />
        ) : (
          <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
});
Checkbox.displayName = "Checkbox";
