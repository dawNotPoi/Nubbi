import { Toast } from "@base-ui/react/toast";
import { CheckCircle2, CircleAlert, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

const manager = Toast.createToastManager<Record<string, never>>();
type Tone = "success" | "error" | "info" | "warning" | "loading";
/** 可更新通知的稳定标识与持续时间；0 表示持续到主动关闭。 */
export type NotificationContent = ReactNode | { content: ReactNode; key?: string; duration?: number };
/**
 * 将业务结果推送到唯一通知出口，同内容通知按稳定标识更新而不重复堆叠。
 * @param type 通知状态。
 * @param content 文案或带标识的通知内容。
 * @param duration 持续秒数。
 * @returns 关闭本条通知的函数。
 */
function notify(type: Tone, content: NotificationContent, duration?: number): () => void {
  const options = typeof content === "object" && content !== null && "content" in content ? content : { content };
  const seconds = options.duration ?? duration ?? (type === "loading" ? 0 : 4);
  const id = manager.add({ id: options.key ?? (typeof options.content === "string" ? `${type}:${options.content}` : undefined), title: options.content, type, timeout: seconds * 1000, priority: type === "error" ? "high" : "low" });
  return () => manager.close(id);
}

/** 全站操作结果入口；共享 shadcn/Base UI Toast 管理器。 */
// eslint-disable-next-line react-refresh/only-export-components -- 通知管理器与宿主遵循同一源码组件接口。
export const toast = {
  /** @param content 成功说明。 @param duration 显示秒数。 @returns 关闭函数。 */
  success: (content: NotificationContent, duration?: number): (() => void) => notify("success", content, duration),
  /** @param content 错误说明。 @param duration 显示秒数。 @returns 关闭函数。 */
  error: (content: NotificationContent, duration?: number): (() => void) => notify("error", content, duration),
  /** @param content 状态说明。 @param duration 显示秒数。 @returns 关闭函数。 */
  info: (content: NotificationContent, duration?: number): (() => void) => notify("info", content, duration),
  /** @param content 警告说明。 @param duration 显示秒数。 @returns 关闭函数。 */
  warning: (content: NotificationContent, duration?: number): (() => void) => notify("warning", content, duration),
  /** @param content 加载说明。 @param duration 显示秒数。 @returns 关闭函数。 */
  loading: (content: NotificationContent, duration?: number): (() => void) => notify("loading", content, duration),
  /** @param key 可选通知标识；省略时关闭全部。 @returns 无返回值。 */
  dismiss: (key?: string): void => manager.close(key),
  add: manager.add,
  close: manager.close,
  update: manager.update,
};
/** 控制器接收的公共通知接口。 */
export type NotificationApi = typeof toast;
const ICONS = { success: CheckCircle2, error: CircleAlert, info: Info, warning: TriangleAlert, loading: LoaderCircle };
const TONES = { success: "text-[var(--status-active-text)]", error: "text-[var(--danger-text)]", warning: "text-[var(--status-inbox-text)]", info: "text-[var(--brand)]", loading: "text-text-muted" };

/** @returns 自动暂停计时、支持关闭与滑动的通知列表。 */
function ToastList(): ReactElement {
  const { toasts } = Toast.useToastManager<Record<string, never>>();
  return <Toast.Portal><Toast.Viewport className="pointer-events-none fixed inset-x-3 top-[max(16px,env(safe-area-inset-top))] z-[1400] mx-auto flex max-w-md flex-col gap-2 outline-none">
    {toasts.map((item) => {
      const type: Tone = item.type && item.type in ICONS ? item.type as Tone : "info";
      const Icon = ICONS[type];
      return <Toast.Root key={item.id} toast={item} swipeDirection="up" className="pointer-events-auto flex items-start gap-3 rounded-panel border border-border-row bg-surface p-3 text-text-primary shadow-[var(--shadow-popover)] data-limited:hidden data-[ending-style]:opacity-0 transition-opacity motion-reduce:transition-none">
        <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", TONES[type], type === "loading" && "animate-spin motion-reduce:animate-none")} />
        <Toast.Content className="min-w-0 flex-1"><Toast.Title className="break-words text-sm leading-6" /><Toast.Description className="mt-1 text-xs text-text-muted" />{item.actionProps && <Toast.Action className="mt-2 text-sm underline" />}</Toast.Content>
        <Toast.Close aria-label="关闭提示" className="grid size-8 shrink-0 place-items-center rounded-control text-text-muted hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"><X aria-hidden="true" className="size-4" /></Toast.Close>
      </Toast.Root>;
    })}
  </Toast.Viewport></Toast.Portal>;
}
/** @returns 应用唯一的全局通知出口，不依赖业务组件生命周期。 */
export function Toaster(): ReactElement {
  return <Toast.Provider toastManager={manager} limit={3}><ToastList /></Toast.Provider>;
}
