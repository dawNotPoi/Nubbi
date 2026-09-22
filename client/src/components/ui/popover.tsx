import { Popover as BasePopover } from "@base-ui/react/popover";
import { isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 项目浮层接口，定位和焦点交给 Base UI。 */
export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  offset?: number;
  matchTriggerWidth?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  open?: boolean;
  onClickOutside?: () => void;
}
/**
 * 共享非模态浮层，保留编辑器与目标选择器的业务控制接口。
 * @param props 触发内容、受控状态、定位和内容。
 * @returns 自动避让视口且支持键盘关闭的浮层。
 */
export function Popover({ trigger, children, className, style, offset = 6, matchTriggerWidth = false, onOpen, onClose, open, onClickOutside }: PopoverProps): ReactElement {
  const element = isValidElement(trigger) ? trigger : <span>{trigger}</span>;
  return <BasePopover.Root open={open} onOpenChange={(next) => { if (next) onOpen?.(); else { onClose?.(); onClickOutside?.(); } }}>
    <BasePopover.Trigger render={element} nativeButton={element.type === "button"} />
    <BasePopover.Portal>
      <BasePopover.Positioner align="start" sideOffset={offset} collisionPadding={12} className="z-[1200]" style={{ "--popover-available-height": "var(--available-height)" } as CSSProperties}>
        <BasePopover.Popup className={cn("max-h-[var(--available-height)] min-w-24 overflow-auto rounded-panel border border-border-row bg-surface p-2 text-text-primary shadow-[var(--shadow-popover)] outline-none", className)} style={{ width: matchTriggerWidth ? "var(--anchor-width)" : undefined, ...style }} onClick={(event) => event.stopPropagation()}>
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  </BasePopover.Root>;
}
export default Popover;
