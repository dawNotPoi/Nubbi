import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/utils/routes";
import clsx from "clsx";
import { useSetAtom } from "jotai";
import {
  ChevronsLeft,
  FolderTree,
  House,
  Presentation,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { sideBarOpenedAtom } from "../../store/atom/common";
import AccountDeletionModal from "../AccountDeletionModal";
import Image from "../UI/Image";
import Popover from "../UI/Popover";
import { IconButton, MenuItemContainer } from "./components";
import NoteMenu from "./NoteMenu";
import ResizeTab from "./ResizeTab";

const SideBar: React.FC = () => {
  const setSideBarOpened = useSetAtom(sideBarOpenedAtom);
  const { user, logout } = useAuth();
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  return (
    <ResizeTab
      className={clsx("group/sidebar px-3 bg-sidebar py-2 font-medium ")}
    >
      <div className="h-full flex flex-col">
        <div className="flex gap-2 justify-between relative">
          <Popover
            trigger={
              <div className="flex gap-2 items-center cursor-pointer">
                <Image
                  className="rounded size-7"
                  src={user?.image || ""}
                  defaultLink="/default.jpg"
                  alt={user?.name}
                />
                <span>{user?.name}</span>
              </div>
            }
          >
            {
              <div className="py-2 w-[136px]">
                <button
                  className="px-2 py-2 w-full hover:bg-red-50 text-red-600 text-left flex items-center gap-2"
                  onClick={() => setDeletionModalOpen(true)}
                >
                  <Trash2 size={15} />
                  <span>注销账号</span>
                </button>
                <button
                  className="px-2 py-2 w-full hover:bg-normal/60 text-slate-700 text-left"
                  onClick={logout}
                >
                  退出登录
                </button>
              </div>
            }
          </Popover>
          <div className="flex-1" />
          <div
            className="flex "
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <IconButton
              onClick={() => {
                setSideBarOpened(false);
              }}
            >
              <ChevronsLeft />
            </IconButton>
          </div>
        </div>
        <div className="flex mt-2 flex-col flex-1 gap-2 overflow-auto ">
          <MenuItemContainer to={routes.home}>
            <House size={16} /> 主页
          </MenuItemContainer>

          <MenuItemContainer to={routes.file}>
            <FolderTree size={16} />
            <span>文件</span>
          </MenuItemContainer>
          <MenuItemContainer to={routes.meetings}>
            <Presentation size={16} />
            <span>会议</span>
          </MenuItemContainer>
          <NoteMenu />
        </div>
      </div>
      <AccountDeletionModal
        open={deletionModalOpen}
        userEmail={user?.email}
        onClose={() => setDeletionModalOpen(false)}
      />
    </ResizeTab>
  );
};

export default SideBar;
