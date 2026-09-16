"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  safePolygon,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";

/**
 * 合并鼠标、键盘和触屏预览行为，浮层始终避开视口边缘。
 * @returns 浮层状态、定位与可访问事件绑定。
 */
export function useLinkPopover(): Pick<
  ReturnType<typeof useFloating>,
  "floatingStyles"
> &
  ReturnType<typeof useInteractions> & {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    setAnchor: ReturnType<typeof useFloating>["refs"]["setReference"];
    setLayer: ReturnType<typeof useFloating>["refs"]["setFloating"];
  } {
  const [open, setOpen] = useState(false);
  const floating = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [offset(10), flip({ padding: 16 }), shift({ padding: 16 })],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(floating.context, {
    mouseOnly: true,
    delay: { open: 280, close: 120 },
    handleClose: safePolygon(),
  });
  const focus = useFocus(floating.context, { visibleOnly: true });
  const dismiss = useDismiss(floating.context, { ancestorScroll: true });
  const role = useRole(floating.context, { role: "tooltip" });
  const interactions = useInteractions([hover, focus, dismiss, role]);
  return {
    floatingStyles: floating.floatingStyles,
    setAnchor: floating.refs.setReference,
    setLayer: floating.refs.setFloating,
    ...interactions,
    open,
    setOpen,
  };
}
