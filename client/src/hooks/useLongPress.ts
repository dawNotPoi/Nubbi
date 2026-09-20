import { useRef, type PointerEventHandler } from "react";

type UseLongPressOptions = {
  delay?: number;
  disabled?: boolean;
  movementThreshold?: number;
  hapticMs?: number;
};

/**
 * 触屏长按：允许轻微手指漂移，滚动位移超过阈值后取消。
 * Mouse 不启用，Desktop 继续使用显式菜单/选择交互。
 */
export function useLongPress<T extends HTMLElement>(
  onLongPress: () => void,
  {
    delay = 460,
    disabled = false,
    hapticMs = 12,
    movementThreshold = 10,
  }: UseLongPressOptions = {},
) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const triggeredRef = useRef(false);

  const cancel = () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
  };

  const onPointerDown: PointerEventHandler<T> = (event) => {
    if (disabled || event.pointerType === "mouse") return;
    cancel();
    triggeredRef.current = false;
    startRef.current = { x: event.clientX, y: event.clientY };
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      triggeredRef.current = true;
      onLongPress();
      if (hapticMs > 0 && navigator.vibrate) navigator.vibrate(hapticMs);
    }, delay);
  };

  const onPointerMove: PointerEventHandler<T> = (event) => {
    const start = startRef.current;
    if (!start || timerRef.current == null) return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (distance > movementThreshold) cancel();
  };

  const onPointerUp: PointerEventHandler<T> = () => cancel();
  const onPointerCancel: PointerEventHandler<T> = () => cancel();
  const onPointerLeave: PointerEventHandler<T> = () => cancel();

  const consumeTriggered = () => {
    if (!triggeredRef.current) return false;
    triggeredRef.current = false;
    return true;
  };

  return {
    consumeTriggered,
    longPressProps: {
      onPointerCancel,
      onPointerDown,
      onPointerLeave,
      onPointerMove,
      onPointerUp,
    },
  };
}
