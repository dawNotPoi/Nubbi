import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  mobileSideBarOpenedAtom,
  sideBarOpenedAtom,
} from "@/store/atom/common";
import { useSetAtom } from "jotai";
import {
  Camera,
  ChevronsLeft,
  KeyRound,
  LogOut,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Modal } from "antd";
import AccountDeletionModal from "../AccountDeletionModal";
import ApiTokenModal from "../ApiTokenModal";
import ChangeAvatarModal from "../ChangeAvatarModal";
import Image from "../UI/Image";
import Popover from "../UI/Popover";
import { IconButton } from "./components";

const menuItemClass =
  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-slate-700 transition-colors hover:bg-gray-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300";

const SideBarHeader: React.FC = () => {
  const { user, logout, updateAvatar } = useAuth();
  const setSideBarOpened = useSetAtom(sideBarOpenedAtom);
  const setMobileSideBarOpened = useSetAtom(mobileSideBarOpenedAtom);
  const isMobile = useIsMobile();
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [apiTokenModalOpen, setApiTokenModalOpen] = useState(false);

  const handleCollapse = () => {
    if (isMobile) {
      setMobileSideBarOpened(false);
      return;
    }
    setSideBarOpened(false);
  };

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

  return (
    <>
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
          <div className="w-[144px] space-y-1 p-1.5">
            <button
              className={menuItemClass + " text-red-600 hover:bg-red-50"}
              onClick={handleRequestAccountDeletion}
            >
              <Trash2 size={15} />
              <span>注销账号</span>
            </button>
            <button
              className={menuItemClass}
              onClick={() => setAvatarModalOpen(true)}
            >
              <Camera size={15} />
              <span>更换头像</span>
            </button>
            <button
              className={menuItemClass}
              onClick={() => setApiTokenModalOpen(true)}
            >
              <KeyRound size={15} />
              <span>鉴权管理</span>
            </button>
            <button className={menuItemClass} onClick={logout}>
              <LogOut size={15} />
              <span>退出登录</span>
            </button>
          </div>
        </Popover>
        <div className="flex-1" />
        <div
          className="flex "
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <IconButton onClick={handleCollapse}>
            <ChevronsLeft />
          </IconButton>
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
      <ApiTokenModal
        open={apiTokenModalOpen}
        onClose={() => setApiTokenModalOpen(false)}
      />
    </>
  );
};

export default SideBarHeader;
