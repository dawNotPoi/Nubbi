import {
  CSSProperties,
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const VIEWPORT_PADDING = 12;

export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  offset?: number;
  matchTriggerWidth?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  coords?: { top: number; left: number };
  open?: boolean;
  onClickOutside?: () => void;
}

export interface PopoverTriggerProps {
  ref: (node: HTMLElement | null) => void;
  onClick: () => void;
}

const Popover: FC<PopoverProps> = ({
  trigger,
  children,
  coords,
  offset = 6,
  matchTriggerWidth = false,
  onOpen,
  onClose,
  style,
  className,
  onClickOutside,
  open: controledOpen,
}) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (controledOpen !== undefined) setOpen(controledOpen);
  }, [controledOpen]);
  const triggerRef = useRef<HTMLElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: -9999,
    left: -9999,
  });
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [availableHeight, setAvailableHeight] = useState<number | undefined>(
    undefined,
  );
  const setTrigger = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const updatePosition = useCallback(() => {
    if (coords) {
      setPos({ top: coords.top, left: coords.left });
      setAvailableHeight(
        Math.max(40, window.innerHeight - coords.top - VIEWPORT_PADDING),
      );
      return;
    }
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (!trigger || !pop) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = Math.max(
      0,
      vh - triggerRect.bottom - offset - VIEWPORT_PADDING,
    );
    const spaceAbove = Math.max(0, triggerRect.top - offset - VIEWPORT_PADDING);
    const shouldPlaceAbove = popRect.height > spaceBelow && spaceAbove > spaceBelow;
    const nextAvailableHeight = Math.max(
      40,
      shouldPlaceAbove ? spaceAbove : spaceBelow,
    );
    const nextWidth = matchTriggerWidth ? triggerRect.width : undefined;
    const popWidth = nextWidth ?? popRect.width;
    const maxLeft = Math.max(VIEWPORT_PADDING, vw - popWidth - VIEWPORT_PADDING);
    const left = Math.max(
      VIEWPORT_PADDING,
      Math.min(triggerRect.left, maxLeft),
    );
    const top = shouldPlaceAbove
      ? Math.max(
          VIEWPORT_PADDING,
          triggerRect.top - offset - Math.min(popRect.height, nextAvailableHeight),
        )
      : Math.min(
          triggerRect.bottom + offset,
          vh - VIEWPORT_PADDING - Math.min(popRect.height, nextAvailableHeight),
        );

    setPos({ top, left });
    setWidth(nextWidth);
    setAvailableHeight(nextAvailableHeight);
  }, [coords, matchTriggerWidth, offset]);

  //处理弹窗打开关闭时的回调
  useEffect(() => {
    if (open) {
      updatePosition();
      onOpen?.();
    } else onClose?.();
  }, [open, updatePosition, onOpen, onClose]);

  //处理点击事件
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const trg = triggerRef.current;
      const pop = popRef.current;
      if (trg && trg.contains(e.target as Node)) return;
      if (pop && pop.contains(e.target as Node)) return;

      onClickOutside?.();
      setOpen(false);
    }
    window.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [onClickOutside, open, updatePosition]);

  useEffect(() => {
    if (!open || !popRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      updatePosition();
    });
    observer.observe(popRef.current);
    return () => observer.disconnect();
  }, [open, updatePosition]);

  const triggerProps: PopoverTriggerProps = {
    ref: setTrigger,
    onClick: () => {
      if (controledOpen !== undefined) return;
      setOpen((v) => !v);
    },
  };

  const triggerNode = (
    <div
      className="hover:cursor-pointer"
      onClick={triggerProps.onClick}
      ref={setTrigger}
    >
      {trigger}
    </div>
  );

  const popContent = (
    <div
      ref={popRef}
      role="dialog"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        minWidth: 100,
        minHeight: 40,
        width,
        zIndex: 1000,
        "--popover-available-height": availableHeight
          ? `${availableHeight}px`
          : undefined,
        ...style,
      } as CSSProperties}
      className={className ?? "bg-white rounded-md border shadow-md"}
    >
      {children}
    </div>
  );
  return (
    <>
      {triggerNode}
      {open && createPortal(popContent, document.body)}
    </>
  );
};

export default Popover;
