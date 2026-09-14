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
        "group sticky top-0 z-20 flex h-12 items-center gap-2 overflow-hidden border-b border-transparent bg-white/90 px-3 backdrop-blur md:h-10 md:gap-4 md:px-2",
        className,
      )}
    >
      <button
        aria-label={opened ? "收起侧边栏" : "展开侧边栏"}
        className={clsx(
          "flex size-9 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-800 md:size-7",
          !isMobile && sideBarOpened
            ? "opacity-0 group-hover:opacity-100"
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
          <Menu size={20} strokeWidth={1.9} />
        ) : !sideBarOpened ? (
          <ChevronsRight size={20} strokeWidth={1.9} />
        ) : null}
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </header>
  );
};
