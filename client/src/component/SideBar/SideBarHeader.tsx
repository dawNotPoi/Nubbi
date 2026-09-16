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
  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-text-muted transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

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
      <div className="relative flex items-center justify-between gap-2">
        <Popover
          trigger={
            <div className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-bg-hover">
              <Image
                className="size-7 rounded-md"
                src={user?.image || ""}
                defaultLink="/default.jpg"
                alt={user?.name}
              />
              <span className="truncate text-sm text-text-primary">{user?.name}</span>
            </div>
          }
        >
          <div className="w-[152px] space-y-1 p-1.5">
            <button
              className={menuItemClass + " text-red-600 hover:bg-red-50"}
              onClick={handleRequestAccountDeletion}
            >
              <Trash2 size={15} />
              <span>注销账号</span>
            </button>
            <button className={menuItemClass} onClick={() => setAvatarModalOpen(true)}>
              <Camera size={15} />
              <span>更换头像</span>
            </button>
            <button className={menuItemClass} onClick={() => setApiTokenModalOpen(true)}>
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
          className="flex"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <IconButton onClick={handleCollapse}>
            <ChevronsLeft size={18} />
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
      <ApiTokenModal open={apiTokenModalOpen} onClose={() => setApiTokenModalOpen(false)} />
    </>
  );
};

export default SideBarHeader;
