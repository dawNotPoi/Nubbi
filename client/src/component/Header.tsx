import clsx from "clsx";
import { useAtom } from "jotai";
import { TbLayoutSidebarRightCollapse } from "react-icons/tb";
import { sideBarOpenedAtom } from "../store/atom/common";

export const Header = ({ className }: { className: string }) => {
  const [sideBarOpened, setSideBarOpened] = useAtom(sideBarOpenedAtom);

  return (
    <header className={clsx("group flex items-center px-2", className)}>
      {!sideBarOpened && (
        <button
          className="opacity-0 group-hover:opacity-100 outline-none "
          onClick={() => {
            setSideBarOpened(!sideBarOpened);
          }}
        >
          <TbLayoutSidebarRightCollapse size={22} />
        </button>
      )}

      {/* <SocketStatus /> */}
    </header>
  );
};
