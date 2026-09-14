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
      className={clsx("group/sidebar px-3 bg-sidebar py-2 font-medium ")}
    >
      <div className="h-full flex flex-col">
        <SideBarHeader />
        <div className="flex mt-2 flex-col flex-1 gap-2 overflow-auto ">
          <NoteDndProvider>
            <MenuItemContainer to={routes.home}>
              <House size={16} /> 主页
            </MenuItemContainer>

            <MenuItemContainer to={routes.file}>
              <FolderTree size={16} />
              <span>文件</span>
              {activeUploads > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-1.5 text-[10px] leading-4 text-white">
                  {activeUploads > 99 ? "99+" : activeUploads}
                </span>
              )}
            </MenuItemContainer>
            <MenuItemContainer to={routes.meetings}>
              <Presentation size={16} />
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
