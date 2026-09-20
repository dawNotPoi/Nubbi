import clsx from "clsx";
import { useAtom } from "jotai";
import { ChevronsRight } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import { sideBarOpenedAtom } from "../store/atom/common";

export const Header = ({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) => {
  const [sideBarOpened, setSideBarOpened] = useAtom(sideBarOpenedAtom);
  const isMobile = useIsMobile();

  return (
    <header
      className={clsx(
        "group sticky top-0 z-20 flex h-12 items-center gap-2 overflow-hidden border-b border-transparent bg-surface/90 px-3 backdrop-blur-md md:h-10 md:gap-4 md:px-2",
        className,
      )}
    >
      {!isMobile && !sideBarOpened ? (
        <button
          aria-label="展开侧边栏"
          className="flex size-7 shrink-0 items-center justify-center rounded-control text-text-subtle transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          onClick={() => setSideBarOpened(true)}
          title="展开侧边栏"
          type="button"
        >
          <ChevronsRight size={20} strokeWidth={1.9} />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">{children}</div>
    </header>
  );
};
