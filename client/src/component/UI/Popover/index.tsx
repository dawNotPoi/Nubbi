import {
  cloneElement,
  CSSProperties,
  FC,
  isValidElement,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  offset?: number;
  onOpen?: () => void;
  onClose?: () => void;
  coords?: { top: number; left: number };
}

export interface PopoverTriggerProps {
  ref: (node: HTMLElement | null) => void;
  onClick: (e?: any) => void;
}

const Popover: FC<PopoverProps> = ({
  trigger,
  children,
  coords,
  offset = 6,
  onOpen,
  onClose,
  style,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: -9999,
    left: -9999,
  });
  const setTrigger = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const updatePosition = useCallback(() => {
    if (coords) {
      setPos({ top: coords.top, left: coords.left });
      return;
    }
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (!trigger || !pop) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    let top = 0;
    let left = 0;
    top = triggerRect.bottom + offset;
    left = triggerRect.left;

    //保证在视图内
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    left = Math.max(0, Math.min(left, vw - popRect.width));
    top = Math.max(0, Math.min(top, vh - popRect.height));

    setPos({ top, left });
  }, [coords, offset]);

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
  }, [open, updatePosition]);

  const triggerProps: PopoverTriggerProps = {
    ref: setTrigger,
    onClick: (e?: any) => {
      setOpen((v) => !v);
    },
  };
  //   const triggerNode = typeof trigger === "function"
  //     ? (trigger as (p: PopoverTriggerProps) => ReactNode)(triggerProps)
  //     : isValidElement(trigger)
  //     ? cloneElement(trigger as any, {
  //         ref: (node: any) => {
  //           // preserve original ref if exists
  //           const origRef: any = (trigger as any).ref;
  //           setTrigger(node);
  //           if (typeof origRef === "function") origRef(node);
  //           else if (origRef && typeof origRef === "object") (origRef as any).current = node;
  //         },
  //         onClick: (e: any) => {
  //           // call original onClick if existed
  //           const origOnClick = (trigger as any).props?.onClick;
  //           origOnClick && origOnClick(e);
  //           triggerProps.onClick(e);
  //         },
  //         "aria-expanded": open,
  //       })
  //     : (
  //       <button type="button" onClick={triggerProps.onClick} ref={setTrigger}>
  //         {trigger}
  //       </button>
  //     );

  const triggerNode =
    typeof trigger === "function" ? (
      (trigger as (props: PopoverTriggerProps) => ReactNode)(triggerProps)
    ) : isValidElement(trigger) ? (
      cloneElement(trigger, {
        ref: (node: any) => {
          setTrigger(node as HTMLElement | null);
        },
        onClick: (e: any) => {
          triggerProps.onClick(e);
        },
      })
    ) : (
      <button onClick={triggerProps.onClick} ref={setTrigger}>
        {trigger}
      </button>
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
        zIndex: 1000,
        ...style,
      }}
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
