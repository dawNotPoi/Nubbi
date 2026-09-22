import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useRef, useState, useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import { Button } from "./button";

/** 确认动作的文案及异步业务契约。 */
export interface ConfirmOptions { title: ReactNode; content?: ReactNode; okText?: string; cancelText?: string; danger?: boolean; onOk?: () => void | Promise<void>; onCancel?: () => void }
interface Confirmation { id: number; options: ConfirmOptions }
let confirmations: Confirmation[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
/** 广播不可变快照，供全局确认出口订阅。 */
function emit(): void { for (const listener of listeners) listener(); }
/** 移除指定确认，供取消及账号切换清理，不调用业务确认动作。 */
function remove(id: number): void { confirmations = confirmations.filter((entry) => entry.id !== id); emit(); }
/**
 * 打开确认框并返回可在账号切换时销毁的句柄。
 * @param options 业务文案、确认和取消处理。
 * @returns 幂等销毁句柄。
 */
// eslint-disable-next-line react-refresh/only-export-components -- 命令式确认与宿主按同一公共模块提供。
export function confirmDialog(options: ConfirmOptions): { destroy: () => void } {
  const id = ++nextId;
  confirmations = [...confirmations, { id, options }];
  emit();
  return { destroy: () => remove(id) };
}
/** 订阅确认队列。 */
function subscribe(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** 获取当前稳定快照。 */
function snapshot(): Confirmation[] { return confirmations; }
/**
 * 单个危险操作确认，默认将焦点放在取消按钮。
 * @param props 确认记录。
 * @returns 保留异步失败状态的确认对话框。
 */
function ConfirmationDialog({ entry }: { entry: Confirmation }): ReactElement {
  const { options, id } = entry;
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  /** 不在请求处理中隐式关闭，避免误认为已取消服务端操作。 */
  const cancel = (): void => { if (inFlight.current) return; remove(id); options.onCancel?.(); };
  /** 成功后关闭，失败保留让业务错误提示说明原因。 */
  const submit = async (): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try { await options.onOk?.(); remove(id); }
    catch { /* 业务调用处负责展示失败原因，确认框保持打开。 */ }
    finally { inFlight.current = false; setPending(false); }
  };
  return <AlertDialog.Root open onOpenChange={(open, details) => { if (!open && pending) details.cancel(); else if (!open) cancel(); }}>
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className="fixed inset-0 z-[1100] bg-black/35" onClick={(event) => event.stopPropagation()} />
      <AlertDialog.Viewport className="fixed inset-0 z-[1101] flex items-center justify-center overflow-y-auto p-4" onClick={(event) => event.stopPropagation()}>
        <AlertDialog.Popup initialFocus={cancelRef} className="max-h-[calc(100dvh-32px)] w-full max-w-md overflow-y-auto rounded-panel border border-border-row bg-surface p-5 text-text-primary shadow-[var(--shadow-popover)] outline-none">
          <AlertDialog.Title className="text-base font-medium">{options.title}</AlertDialog.Title>
          <AlertDialog.Description render={<div />} className="mt-3 break-words text-sm leading-relaxed text-text-muted">{options.content}</AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close render={<Button ref={cancelRef} variant="outline" disabled={pending} className="max-md:min-h-11" />}>{options.cancelText || "取消"}</AlertDialog.Close>
            <Button variant={options.danger ? "destructive" : "primary"} loading={pending} disabled={pending} onClick={() => void submit()} className="max-md:min-h-11">{options.okText || "确认"}</Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Viewport>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}
/** @returns 应用中唯一的命令式确认出口，逐个处理确认避免浮层争抢。 */
export function ConfirmDialogHost(): ReactElement | null {
  const entries = useSyncExternalStore(subscribe, snapshot, snapshot);
  return entries[0] ? <ConfirmationDialog key={entries[0].id} entry={entries[0]} /> : null;
}
