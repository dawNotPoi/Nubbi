import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

/** 选择项的值和可读名称。 */
export interface SelectOption { value: string; label: string; disabled?: boolean }
/** 业务只传选择数据，不再携带第三方下拉配置。 */
export interface SelectProps {
  value?: string;
  options: SelectOption[];
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * 使用 Base UI 的选择、键盘导航和焦点恢复，视觉遵循项目主题。
 * @param props 受控值、选项和输入属性。
 * @returns 单选下拉框。
 */
export function Select({ value, options, onValueChange, placeholder = "请选择", disabled, required, id, name, className, ...aria }: SelectProps): ReactElement {
  return <BaseSelect.Root items={options} value={value ?? null} onValueChange={(next) => { if (next !== null) onValueChange?.(next); }} disabled={disabled} required={required} id={id} name={name}>
    <BaseSelect.Trigger {...aria} className={cn("nubbi-input flex min-h-9 w-full items-center justify-between gap-2 rounded-control border px-3 text-left text-sm disabled:opacity-50 max-md:min-h-11", className)}>
      <BaseSelect.Value placeholder={placeholder} className="truncate" />
      <BaseSelect.Icon><ChevronDown aria-hidden="true" className="size-4 shrink-0" /></BaseSelect.Icon>
    </BaseSelect.Trigger>
    <BaseSelect.Portal>
      <BaseSelect.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-[1200] outline-none">
        <BaseSelect.Popup className="nubbi-menu-popup max-h-[min(320px,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
          <BaseSelect.List>{options.map((option) => <BaseSelect.Item key={option.value} value={option.value} disabled={option.disabled} className="nubbi-menu-item flex items-center gap-3 max-md:min-h-11">
            <BaseSelect.ItemText className="min-w-0 flex-1 truncate">{option.label}</BaseSelect.ItemText>
            <BaseSelect.ItemIndicator><Check aria-hidden="true" className="size-4" /></BaseSelect.ItemIndicator>
          </BaseSelect.Item>)}</BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  </BaseSelect.Root>;
}
