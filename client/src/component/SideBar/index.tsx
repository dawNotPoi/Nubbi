import { NubbiBrand } from "@/components/brand/NubbiBrand";
import { activeUploadCountAtom } from "@/store/atom/FileAtom";
import { routes } from "@/utils/routes";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import {
  FolderTree,
  House,
  Presentation,
} from "lucide-react";
import React from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { mobileSideBarOpenedAtom } from "../../store/atom/common";
import { MenuItemContainer } from "./components";
import { NoteDndProvider } from "./NoteDnd/NoteDndProvider";
import NoteMenu from "./NoteMenu";
import ResizeTab from "./ResizeTab";
import SideBarHeader from "./SideBarHeader";

const SideBar: React.FC = () => {
  const activeUploads = useAtomValue(activeUploadCountAtom);
  const setMobileSideBarOpened = useSetAtom(mobileSideBarOpenedAtom);
  const isMobile = useIsMobile();
  const location = useLocation();

  React.useEffect(() => {
    setMobileSideBarOpened(false);
  }, [location.pathname, setMobileSideBarOpened]);

  React.useEffect(() => {
    if (!isMobile) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSideBarOpened(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isMobile, setMobileSideBarOpened]);

  return (
    <ResizeTab
      className={clsx(
        "group/sidebar bg-sidebar px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))] text-text-primary md:py-2 md:text-sm",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="mb-2 flex min-h-9 items-center px-1.5">
          <NubbiBrand size="sm" />
        </div>
        <SideBarHeader />
        <div className="mt-2 flex flex-1 flex-col gap-1 overflow-auto overscroll-contain pb-2">
          <NoteDndProvider>
            <MenuItemContainer to={routes.home}>
              <House size={18} className="text-text-subtle md:size-4" /> 主页
            </MenuItemContainer>

            <MenuItemContainer to={routes.file}>
              <FolderTree size={18} className="text-text-subtle md:size-4" />
              <span>文件</span>
              {activeUploads > 0 && (
                <span className="ml-auto rounded-full bg-[var(--entity-file)] px-1.5 text-[10px] font-medium leading-4 text-white">
                  {activeUploads > 99 ? "99+" : activeUploads}
                </span>
              )}
            </MenuItemContainer>
            <MenuItemContainer to={routes.meetings}>
              <Presentation size={18} className="text-text-subtle md:size-4" />
              <span>会议</span>
            </MenuItemContainer>
            <NoteMenu />
          </NoteDndProvider>
        </div>
      </div>
    </ResizeTab>
  );
};

export default SideBar;
