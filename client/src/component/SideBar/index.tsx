import { NubbiBrand } from "@/components/brand/NubbiBrand";
import { activeUploadCountAtom } from "@/store/atom/FileAtom";
import { sideBarOpenedAtom } from "@/store/atom/common";
import { routes } from "@/utils/routes";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import {
  ChevronsLeft,
  Pin,
  FolderTree,
  House,
  Presentation,
} from "lucide-react";
import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { mobileSideBarOpenedAtom } from "../../store/atom/common";
import { IconButton, MenuItemContainer } from "./components";
import { NoteDndProvider } from "./NoteDnd/NoteDndProvider";
import NoteMenu from "./NoteMenu";
import ResizeTab from "./ResizeTab";
import SideBarHeader from "./SideBarHeader";

/**
 * 将品牌、导航和账号入口分置侧栏顶部、中部和底部。
 * @returns 桌面侧栏与现有移动端抽屉容器。
 */
const SideBar: React.FC = () => {
  const activeUploads = useAtomValue(activeUploadCountAtom);
  const setMobileSideBarOpened = useSetAtom(mobileSideBarOpenedAtom);
  const setSideBarOpened = useSetAtom(sideBarOpenedAtom);
  const sideBarOpened = useAtomValue(sideBarOpenedAtom);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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

  /** 顶部的折叠控件只改变侧栏可见状态，不影响账号菜单业务。 */
  const handleCollapse = (): void => {
    if (isMobile) setMobileSideBarOpened(false);
    else setSideBarOpened((opened) => !opened);
  };

  return (
    <ResizeTab
      holdOpen={accountMenuOpen}
      className={clsx(
        "group/sidebar bg-sidebar px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))] text-text-primary md:py-2 md:text-sm",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="mb-3 flex min-h-10 items-center justify-between gap-2 px-1.5">
          <NubbiBrand size="sm" />
          <IconButton aria-label={sideBarOpened ? "收起侧边栏" : "固定侧边栏"} title={sideBarOpened ? "收起侧边栏" : "固定侧边栏"} onClick={handleCollapse}>
            {sideBarOpened ? <ChevronsLeft size={20} /> : <Pin size={18} />}
          </IconButton>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto overscroll-contain pb-2">
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
        <div className="mt-2 border-t border-border-row pt-2">
          <SideBarHeader menuOpen={accountMenuOpen} onMenuOpenChange={setAccountMenuOpen} />
        </div>
      </div>
    </ResizeTab>
  );
};

export default SideBar;
