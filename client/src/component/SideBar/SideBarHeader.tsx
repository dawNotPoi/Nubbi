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
  "flex h-11 w-full items-center gap-2 rounded-control px-2.5 text-left text-[15px] font-normal text-text-muted transition-[background-color,color,transform] active:scale-[0.99] active:bg-bg-selected hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:h-8 md:rounded-compact md:px-2 md:text-sm";

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
      <div className="relative flex min-h-11 items-center justify-between gap-2 md:min-h-0">
        <Popover
          trigger={
            <div className="flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-control px-1.5 py-1 transition-[background-color,transform] active:scale-[0.99] active:bg-bg-selected hover:bg-bg-hover md:min-h-0 md:rounded-compact">
              <Image
                className="size-8 rounded-full md:size-7"
                src={user?.image || ""}
                defaultLink="/default.jpg"
                alt={user?.name}
              />
              <span className="truncate text-[15px] font-medium text-text-primary md:text-sm">{user?.name}</span>
            </div>
          }
        >
          <div className="w-[184px] space-y-1 p-1.5 md:w-[152px] md:p-1">
            <button
              className={menuItemClass + " text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"}
              onClick={handleRequestAccountDeletion}
            >
              <Trash2 size={16} />
              <span>注销账号</span>
            </button>
            <button className={menuItemClass} onClick={() => setAvatarModalOpen(true)}>
              <Camera size={16} />
              <span>更换头像</span>
            </button>
            <button className={menuItemClass} onClick={() => setApiTokenModalOpen(true)}>
              <KeyRound size={16} />
              <span>鉴权管理</span>
            </button>
            <button className={menuItemClass} onClick={logout}>
              <LogOut size={16} />
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
          <IconButton aria-label="关闭侧边栏" onClick={handleCollapse}>
            <ChevronsLeft size={20} />
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
