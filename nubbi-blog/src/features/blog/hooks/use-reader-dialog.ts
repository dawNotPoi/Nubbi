"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * 阅读浮层共用原生焦点约束、滚动锁定与关闭恢复，避免各交互自行处理。
 * @param mobileOnly 是否在切回桌面布局时自动关闭。
 * @param initialFocus 打开时需要优先聚焦的内部元素选择器。
 * @returns 对话框状态、引用和开关方法。
 */
export function useReaderDialog(mobileOnly = false, initialFocus?: string): {
  open: boolean;
  dialog: RefObject<HTMLDialogElement | null>;
  show: () => void;
  close: () => void;
  dismiss: () => void;
} {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    if (initialFocus) element.querySelector<HTMLElement>(initialFocus)?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    const selected = element.querySelector<HTMLElement>("nav [aria-current]");
    const navigation = selected?.parentElement;
    if (selected && navigation) {
      navigation.scrollTop += selected.getBoundingClientRect().top - navigation.getBoundingClientRect().top
        - navigation.clientHeight / 2 + selected.clientHeight / 2;
    }
    const desktop = window.matchMedia("(min-width: 1024px)");
    /** 响应旋转或窗口调整，避免桌面布局保留不可见的模态焦点锁。 */
    const resize = (): void => { if (mobileOnly && desktop.matches) element.close(); };
    desktop.addEventListener("change", resize);
    resize();
    return () => {
      desktop.removeEventListener("change", resize);
      if (element.open) element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [open, mobileOnly, initialFocus]);
  return { open, dialog, show: () => setOpen(true), close: () => dialog.current?.close(), dismiss: () => setOpen(false) };
}
