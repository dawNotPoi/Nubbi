import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/utils/routes";
import clsx from "clsx";
import { useSetAtom } from "jotai";
import {
  Camera,
  ChevronsLeft,
  FolderTree,
  House,
  LogOut,
  Presentation,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { sideBarOpenedAtom } from "../../store/atom/common";
import { Modal } from "antd";
import AccountDeletionModal from "../AccountDeletionModal";
import ChangeAvatarModal from "../ChangeAvatarModal";
import Image from "../UI/Image";
import Popover from "../UI/Popover";
import { IconButton, MenuItemContainer } from "./components";
import NoteMenu from "./NoteMenu";
import ResizeTab from "./ResizeTab";

const SideBar: React.FC = () => {
  const setSideBarOpened = useSetAtom(sideBarOpenedAtom);
  const { user, logout, updateAvatar } = useAuth();
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const handleRequestAccountDeletion = () => {
    Modal.confirm({
      title: "确认注销账号？",
      content: "注销会删除账号、登录会话以及个人数据。继续后需要邮箱验证码验证。",
      okText: "继续验证",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => setDeletionModalOpen(true),
    });
  };

  const handleChangeAvatar = () => {
    setAvatarModalOpen(true);
  };

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
              <div className="w-[144px] space-y-1 p-1.5">
                <button
                  className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                  onClick={handleRequestAccountDeletion}
                >
                  <Trash2 size={15} />
                  <span>注销账号</span>
                </button>
                <button
                  className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-slate-700 transition-colors hover:bg-gray-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                  onClick={handleChangeAvatar}
                >
                  <Camera size={15} />
                  <span>更换头像</span>
                </button>
                <button
                  className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-slate-700 transition-colors hover:bg-gray-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                  onClick={logout}
                >
                  <LogOut size={15} />
                  <span>退出登录</span>
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
      <ChangeAvatarModal
        open={avatarModalOpen}
        currentImage={user?.image || undefined}
        onClose={() => setAvatarModalOpen(false)}
        onConfirm={updateAvatar}
      />
    </ResizeTab>
  );
};

export default SideBar;
