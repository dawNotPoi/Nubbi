import clsx from "clsx";
import { X } from "lucide-react";
import {
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type StackItem = { id: string };
type StackCtx = {
  stack: StackItem[];
  register: (id: string) => void;
  unregister: (id: string) => void;
  bringToTop: (id: string) => void;
};

const ModalStackCtx = createContext<StackCtx | null>(null);

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [stack, setStack] = useState<StackItem[]>([]);
  const register = useCallback((id: string) => {
    setStack((prev) =>
      prev.find((item) => item.id === id) ? prev : prev.concat({ id })
    );
  }, []);
  const unregister = useCallback((id: string) => {
    setStack((prev) => prev.filter((item) => item.id !== id));
  }, []);
  const bringToTop = useCallback((id: string) => {
    setStack((prev) => prev.filter((item) => item.id !== id).concat({ id }));
  }, []);
  const value = useMemo(
    () => ({ stack, register, unregister, bringToTop }),
    [stack, register, unregister, bringToTop]
  );
  return (
    <ModalStackCtx.Provider value={value}>{children}</ModalStackCtx.Provider>
  );
};

const useModalStack = () => {
  const ctx = useContext(ModalStackCtx);
  if (!ctx) {
    throw new Error("Modal muse be wrapped by ModalProvider");
  }
  return ctx;
};

//utils
//ifMounted slove SSR
const useIsMounted = () => {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(true);
    return () => setM(false);
  }, []);
  return m;
};
//slove  scroll lock
const useBodyLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
};

type ModalProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
  trigger?: React.ReactElement;
  title?: React.ReactNode;
  children?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  showClose?: boolean;
  maskClosable?: boolean;
  className?: string; // 容器样式（白板部分）
  overlayClassName?: string; // 遮罩样式
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  zIndexBase?: number; // 栈基准 z-index，默认 1000
};

export const Modal = ({
  trigger,
  overlayClassName,
  maskClosable = true,
  zIndexBase = 1000,
  className,
  showClose,
  children,
  open: controlled,
  title,
  defaultOpen,
  onOpenChange,
  onOk,
  onCancel,
  okText,
  cancelText,
}: ModalProps) => {
  const mounted = useIsMounted();
  const [internal, setInternal] = useState(!!defaultOpen);
  const isControlled = controlled !== undefined;
  const open = isControlled ? !!controlled : internal;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternal(v);
    onOpenChange?.(v);
  };
  const { stack, register, unregister, bringToTop } = useModalStack();
  const id = useId();
  const isTop = stack.length > 0 && stack[stack.length - 1]?.id === id;
  const index = Math.max(
    0,
    stack.findIndex((item) => item.id === id)
  );
  const z = zIndexBase + index * 10;

  //弹窗状态变化时改变堆栈状态
  useEffect(() => {
    if (open) register(id);
    return () => unregister(id);
  }, [open, id, register, unregister]);

  //弹窗交互时将弹窗置于顶层 并focus
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    bringToTop(id);
    const prev = document.activeElement as HTMLElement | null;
    contentRef.current?.focus;
    const onKey = (e: KeyboardEvent) => {
      if (!isTop) return;
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open]);
  //弹窗开启时,关闭body滚动
  useBodyLock(open);
  const triggerEl = trigger
    ? cloneElement(trigger, {
        onClick: (e: any) => {
          trigger.props.onClick?.(e);
          setOpen(true);
        },
      })
    : null;

  //not mounted or closed
  if (!mounted) return triggerEl;
  return (
    <>
      {triggerEl}
      {open
        ? createPortal(
            <div className="fixed inset-0" style={{ zIndex: z }}>
              {/* 背景 */}
              <div
                className={overlayClassName || "absolute inset-0 bg-black/40 "}
                data-enter=""
                onClick={(e) => {
                  //只关闭顶层
                  if (!isTop) return;
                  if (maskClosable && e.target === e.currentTarget) {
                    setOpen(false);
                    onCancel?.();
                  }
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  tabIndex={-1}
                  ref={contentRef}
                  className={clsx(
                    "relative mx-auto mt-[10vh] w-[min(90vw,320px)] rounded-md bg-white shadow-lg outline-none",
                    className
                  )}
                  style={{ zIndex: z + 1 }}
                >
                  <div className="flex items-center justify-between  px-4 pt-2">
                    <div className="font-medium">{title}</div>
                    {showClose && (
                      <button
                        aria-label="Close"
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 "
                        onClick={() => {
                          if (isTop) {
                            setOpen(false);
                            onCancel?.();
                          }
                        }}
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                  <div className="px-4 ">{children}</div>
                  <div className="flex justify-end gap-2  px-4 py-3">
                    {cancelText && (
                      <button
                        className="rounded px-3 bg-sky-500 py-1.5 hover:bg-gray-100"
                        onClick={() => {
                          if (!isTop) return;
                          onCancel?.();
                          setOpen(false);
                        }}
                      >
                        {cancelText}
                      </button>
                    )}
                    {okText && (
                      <button
                        className="rounded  px-3 py-1.5 bg-sky-600 text-white hover:opacity-90"
                        onClick={async () => {
                          if (!isTop) return;
                          await onOk?.();
                          onCancel?.();
                          setOpen(false);
                        }}
                      >
                        {okText}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};
