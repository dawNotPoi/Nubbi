import type { ReactElement, ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** 笔记库过滤或排序项；泛型约束防止把任意菜单值传回控制器。 */
export type NoteLibraryOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

/** 笔记库单选菜单接口，不承担筛选或排序业务计算。 */
type NoteLibraryOptionMenuProps<T extends string> = {
  label: string;
  value: T;
  options: readonly NoteLibraryOption<T>[];
  trigger: ReactElement;
  onValueChange: (value: T) => void;
};

/**
 * 组合单选菜单并核对选项值；打开浮层不锁住页面滚动。
 * @param props 当前选中值、有效选项、原位置触发按钮和回调。
 * @returns 笔记库排序或过滤菜单。
 */
export function NoteLibraryOptionMenu<T extends string>({
  label,
  value,
  options,
  trigger,
  onValueChange,
}: NoteLibraryOptionMenuProps<T>): ReactElement {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent aria-label={label}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue: unknown) => {
            const option = options.find((candidate) => candidate.value === nextValue);
            if (option) onValueChange(option.value);
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
              {option.icon}
              <span>{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
