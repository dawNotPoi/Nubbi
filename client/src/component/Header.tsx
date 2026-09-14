import clsx from "clsx";
import { useAtom } from "jotai";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { PropsWithChildren } from "react";
import { sideBarOpenedAtom } from "../store/atom/common";

export const Header = ({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) => {
  const [sideBarOpened, setSideBarOpened] = useAtom(sideBarOpenedAtom);

  return (
    <header
      className={clsx(
        "group sticky top-0 z-20 flex h-10 items-center gap-4 overflow-hidden bg-white/90 px-2 backdrop-blur",
        className,
      )}
    >
      <button
        className="flex items-center justify-center rounded-md text-neutral-500 opacity-0 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-800 group-hover:opacity-100"
        onClick={() => {
          setSideBarOpened(!sideBarOpened);
        }}
        title={sideBarOpened ? "收起侧边栏" : "展开侧边栏"}
      >
        {sideBarOpened ? (
          <PanelLeftClose size={20} strokeWidth={1.9} />
        ) : (
          <PanelLeftOpen size={20} strokeWidth={1.9} />
        )}
      </button>
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </header>
  );
};
