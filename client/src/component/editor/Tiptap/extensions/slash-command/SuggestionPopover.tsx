import {
  CSSProperties,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import SuggestionList, {
  SuggestionListProps,
  SuggestionListRef,
} from "./SuggestionList";

const GAP = 6;
const VIEWPORT_PADDING = 12;
const MAX_MENU_HEIGHT = 408;

export interface SuggestionPopoverProps extends SuggestionListProps {
  clientRect?: (() => DOMRect | null) | null;
  onClickOutside?: () => void;
}

interface PopoverPosition {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const isSamePosition = (a: PopoverPosition | null, b: PopoverPosition) =>
  a !== null &&
  a.left === b.left &&
  a.top === b.top &&
  a.bottom === b.bottom &&
  a.maxHeight === b.maxHeight;

const SuggestionPopover = forwardRef<SuggestionListRef, SuggestionPopoverProps>(
  (props, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState<PopoverPosition | null>(null);

    const { clientRect, onClickOutside, ...listProps } = props;
    const hasContent =
      listProps.items.length > 0 || Boolean(listProps.query?.trim());

    const updatePosition = () => {
      const rect = clientRect?.();
      const container = containerRef.current;
      if (!rect || !container) return;

      // 期望高度 = 内容完整高度(内层列表可能已被裁剪滚动,用 scrollHeight 还原)
      const menu = container.firstElementChild as HTMLElement | null;
      const chrome = menu
        ? container.offsetHeight - menu.clientHeight
        : container.offsetHeight;
      const desiredHeight = Math.min(
        (menu?.scrollHeight ?? 0) + chrome,
        MAX_MENU_HEIGHT,
      );

      const spaceBelow =
        window.innerHeight - rect.bottom - GAP - VIEWPORT_PADDING;
      const spaceAbove = rect.top - GAP - VIEWPORT_PADDING;
      const placeBelow =
        spaceBelow >= desiredHeight || spaceBelow >= spaceAbove;
      const maxHeight = Math.max(placeBelow ? spaceBelow : spaceAbove, 48);

      const left = Math.min(
        Math.max(rect.left, VIEWPORT_PADDING),
        Math.max(
          window.innerWidth - container.offsetWidth - VIEWPORT_PADDING,
          VIEWPORT_PADDING,
        ),
      );

      const next: PopoverPosition = placeBelow
        ? { left, top: rect.bottom + GAP, maxHeight }
        : { left, bottom: window.innerHeight - rect.top + GAP, maxHeight };

      setPosition((prev) => (isSamePosition(prev, next) ? prev : next));
    };

    const updatePositionRef = useRef(updatePosition);
    updatePositionRef.current = updatePosition;

    // 每次渲染后重算(items 过滤、光标移动都会触发渲染);setState 前做了相等判断,不会死循环
    useLayoutEffect(() => {
      updatePositionRef.current();
    });

    useEffect(() => {
      const handleReposition = () => updatePositionRef.current();
      window.addEventListener("resize", handleReposition);
      // capture 捕获内层滚动容器的 scroll 事件
      window.addEventListener("scroll", handleReposition, true);
      return () => {
        window.removeEventListener("resize", handleReposition);
        window.removeEventListener("scroll", handleReposition, true);
      };
    }, []);

    useEffect(() => {
      const handleMouseDown = (event: MouseEvent) => {
        const container = containerRef.current;
        const editorElement = props.editor.view.dom;
        if (
          container &&
          event.target instanceof Node &&
          !container.contains(event.target) &&
          !editorElement.contains(event.target)
        ) {
          onClickOutside?.();
        }
      };
      document.addEventListener("mousedown", handleMouseDown);
      return () => {
        document.removeEventListener("mousedown", handleMouseDown);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onClickOutside]);

    if (!hasContent) return null;

    const style: CSSProperties = position
      ? {
          left: position.left,
          top: position.top,
          bottom: position.bottom,
          maxHeight: position.maxHeight,
        }
      : { left: 0, top: 0, visibility: "hidden" };

    return createPortal(
      <div
        ref={containerRef}
        className="dn-editor__slash-command-popover"
        style={style}
      >
        <SuggestionList ref={ref} {...listProps} />
      </div>,
      document.body,
    );
  },
);

export default SuggestionPopover;
