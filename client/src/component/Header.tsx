import clsx from "clsx";
import { useAtom } from "jotai";
import { ChevronsRight, Menu } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  mobileSideBarOpenedAtom,
  sideBarOpenedAtom,
} from "../store/atom/common";

export const Header = ({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) => {
  const [sideBarOpened, setSideBarOpened] = useAtom(sideBarOpenedAtom);
  const [mobileSideBarOpened, setMobileSideBarOpened] = useAtom(
    mobileSideBarOpenedAtom,
  );
  const isMobile = useIsMobile();
  const opened = isMobile ? mobileSideBarOpened : sideBarOpened;

  return (
    <header
      className={clsx(
        "group sticky top-0 z-20 flex h-12 items-center gap-2 overflow-hidden border-b border-transparent bg-surface/90 px-2 backdrop-blur-md md:h-10 md:gap-4 md:px-2",
        className,
      )}
    >
      <button
        aria-label={opened ? "收起侧边栏" : "展开侧边栏"}
        className={clsx(
          "flex size-11 shrink-0 items-center justify-center rounded-[8px] text-text-subtle transition-[background-color,color,transform] active:scale-[0.98] active:bg-bg-selected hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:size-7 md:rounded-md",
          !isMobile && sideBarOpened
            ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            : "opacity-100",
        )}
        onClick={() => {
          if (isMobile) {
            setMobileSideBarOpened(!mobileSideBarOpened);
            return;
          }
          setSideBarOpened(!sideBarOpened);
        }}
        title={opened ? "收起侧边栏" : "展开侧边栏"}
        type="button"
      >
        {isMobile ? (
          <Menu size={21} strokeWidth={1.9} />
        ) : !sideBarOpened ? (
          <ChevronsRight size={20} strokeWidth={1.9} />
        ) : null}
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </header>
  );
};
