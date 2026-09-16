import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { useIsMobile } from "../../../hooks/useIsMobile";
import {
  mobileSideBarOpenedAtom,
  sideBarOpenedAtom,
} from "../../../store/atom/common";

export default function ResizeTab({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [desktopHovered, setDesktopHovered] = useState(false);
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  // 开始调整大小
  const startResizing = (e: React.MouseEvent) => {
    if (isMobile || sidebarRef.current == null) return null;
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarRef.current.getBoundingClientRect().width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // 添加全局事件监听
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const diff = event.clientX - startXRef.current;
      setSidebarWidth(
        Math.max(180, Math.min(400, startWidthRef.current + diff)),
      );
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const sideBarOpened = useAtomValue(sideBarOpenedAtom);
  const mobileSideBarOpened = useAtomValue(mobileSideBarOpenedAtom);
  const setMobileSideBarOpened = useSetAtom(mobileSideBarOpenedAtom);
  const desktopCollapsed = !isMobile && !sideBarOpened;
  const opened = isMobile
    ? mobileSideBarOpened
    : sideBarOpened || desktopHovered;

  useEffect(() => {
    if (isMobile || sideBarOpened) setDesktopHovered(false);
  }, [isMobile, sideBarOpened]);

  useEffect(() => {
    if (!isMobile || !mobileSideBarOpened) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, mobileSideBarOpened]);

  const sideBar = (
    <aside
      ref={sidebarRef}
      aria-hidden={!opened}
      className={clsx(
        "h-full overflow-hidden bg-sidebar",
        isMobile
          ? "fixed inset-y-0 left-0 z-50 w-[min(86vw,320px)] max-w-[320px] shadow-2xl transition-transform duration-200"
          : "relative",
        desktopCollapsed &&
          "rounded-xl border border-border-toolbar shadow-2xl",
        isMobile && !opened && "pointer-events-none -translate-x-full",
      )}
      style={isMobile ? undefined : { width: "100%" }}
    >
      <div className={clsx("h-full min-w-[180px]", className)}>{children}</div>
      {!isMobile && sideBarOpened ? (
        <div
          onMouseDown={startResizing}
          className={clsx(
            "absolute bottom-0 right-0 top-0 h-full w-0.5 cursor-col-resize bg-gray-200/50 transition-all duration-300 hover:w-1",
            isResizing && "w-1 bg-gray-300",
          )}
        />
      ) : null}
    </aside>
  );

  return (
    <>
      {isMobile && opened ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileSideBarOpened(false)}
        />
      ) : null}
      {!isMobile && !sideBarOpened ? (
        <div
          aria-hidden="true"
          className="fixed inset-y-0 left-0 z-30 w-2"
          onMouseEnter={() => setDesktopHovered(true)}
        />
      ) : null}
      {desktopCollapsed ? (
        <div
          onMouseLeave={() => setDesktopHovered(false)}
          className={clsx(
            "fixed bottom-3 left-0 top-3 z-40 box-border pl-2 transition-[opacity,transform,translate] duration-150 ease-out",
            desktopHovered
              ? "translate-x-0 opacity-100"
              : "pointer-events-none -translate-x-2 opacity-0",
          )}
          style={{ width: sidebarWidth + 8 }}
        >
          {sideBar}
        </div>
      ) : isMobile ? (
        sideBar
      ) : (
        <div
          className="relative h-full shrink-0 transition-[width] duration-200"
          style={{ width: sideBarOpened ? sidebarWidth : 0 }}
        >
          {sideBar}
        </div>
      )}
    </>
  );
}
