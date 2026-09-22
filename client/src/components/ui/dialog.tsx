import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./sheet";

/** 对话框组合原语。 */
export const Dialog = BaseDialog.Root;
/** 对话框触发器，使用 render 组合已有按钮。 */
export const DialogTrigger = BaseDialog.Trigger;
/** 对话框关闭动作。 */
export const DialogClose = BaseDialog.Close;
/** 对话框可访问标题。 */
export const DialogTitle = BaseDialog.Title;
/** 对话框可访问说明。 */
export const DialogDescription = BaseDialog.Description;

/** 业务弹窗的内容与动作契约。 */
export interface ModalProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactElement;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  overlayClassName?: string;
  showClose?: boolean;
  maskClosable?: boolean;
  onCancel?: () => void;
  onOk?: () => void | Promise<void>;
  okText?: string;
  cancelText?: string;
  confirmLoading?: boolean;
  okButtonProps?: Pick<ButtonProps, "disabled" | "variant">;
  width?: number | string;
  zIndexBase?: number;
}

/**
 * 基于 Dialog 原语统一弹窗，焦点锁定、Escape 和滚动锁由底座负责。
 * @param props 受控状态、标题、内容及明确的确认动作。
 * @returns 主题化、窄屏可滚动的弹窗。
 */
export function Modal({ open, defaultOpen = false, onOpenChange, trigger, title, children, footer, className, overlayClassName, showClose = true, maskClosable = true, onCancel, onOk, okText, cancelText, confirmLoading = false, okButtonProps, width, zIndexBase = 1000 }: ModalProps): ReactElement {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const visible = open ?? internalOpen;
  const busy = pending || confirmLoading;
  /**
   * 改变可见状态；沿用旧 Modal 契约，关闭（含 onOk 成功后的自动关闭）都会通知一次 onCancel，
   * 业务侧现有 onCancel 都按 onClose 语义使用，不要改成 AntD 只在用户取消时触发。
   */
  const changeOpen = (next: boolean): void => {
    setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) onCancel?.();
  };
  /** 等待确认成功再关闭；业务负责展示失败原因。 */
  const submit = async (): Promise<void> => {
    if (inFlight.current || confirmLoading) return;
    inFlight.current = true;
    setPending(true);
    try { await onOk?.(); changeOpen(false); }
    catch { /* 失败时保留弹窗和用户输入。 */ }
    finally { inFlight.current = false; setPending(false); }
  };
  const actions = footer !== undefined ? footer : (okText || cancelText) ? <div className="mt-5 flex justify-end gap-2">
    {cancelText && <Button variant="outline" disabled={busy} onClick={() => changeOpen(false)} className="max-md:min-h-11">{cancelText}</Button>}
    {okText && <Button variant={okButtonProps?.variant ?? "primary"} disabled={busy || okButtonProps?.disabled} loading={busy} onClick={() => void submit()} className="max-md:min-h-11">{okText}</Button>}
  </div> : null;
  if (isMobile) return <Sheet open={visible} onOpenChange={(next, details) => { if (busy && !next) { details.cancel(); return; } changeOpen(next); }} disablePointerDismissal={!maskClosable}>
    {trigger && <SheetTrigger render={trigger} />}
    <SheetContent showClose={showClose && !busy} className={className} onClick={(event) => event.stopPropagation()}>
      <SheetTitle className={cn("mb-4 pr-10", !title && "sr-only")}>{title || "对话框"}</SheetTitle>
      {children}
      {actions}
    </SheetContent>
  </Sheet>;
  return <BaseDialog.Root open={visible} onOpenChange={(next, details) => { if (busy && !next) { details.cancel(); return; } changeOpen(next); }} disablePointerDismissal={!maskClosable}>
    {trigger && <BaseDialog.Trigger render={trigger} />}
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={cn("fixed inset-0 bg-black/35", overlayClassName)} style={{ zIndex: zIndexBase }} onClick={(event) => event.stopPropagation()} />
      <BaseDialog.Viewport className="fixed inset-0 flex items-center justify-center overflow-y-auto p-3 md:p-6" style={{ zIndex: zIndexBase + 1 }} onClick={(event) => event.stopPropagation()}>
        <BaseDialog.Popup className={cn("nubbi-dialog relative max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto rounded-panel border border-border-row bg-surface p-5 text-text-primary shadow-[var(--shadow-popover)] outline-none", className)} style={width ? { width, maxWidth: "calc(100vw - 24px)" } as CSSProperties : undefined} onClick={(event) => event.stopPropagation()}>
          <BaseDialog.Title className={cn("mb-4 pr-10 text-base font-medium", !title && "sr-only")}>{title || "对话框"}</BaseDialog.Title>
          {showClose && <BaseDialog.Close render={<Button variant="ghost" size="icon" className="absolute right-2 top-2 size-11 md:size-8" disabled={busy} aria-label="关闭对话框" />}><X aria-hidden="true" /></BaseDialog.Close>}
          {children}
          {actions}
        </BaseDialog.Popup>
      </BaseDialog.Viewport>
    </BaseDialog.Portal>
  </BaseDialog.Root>;
}
