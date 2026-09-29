import { useAuth } from "@/hooks/useAuth";
import {
  Camera,
  KeyRound,
  LogOut,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import AccountDeletionModal from "../AccountDeletionModal";
import ApiTokenModal from "../ApiTokenModal";
import ChangeAvatarModal from "../ChangeAvatarModal";
import Image from "../UI/Image";
import Popover from "../UI/Popover";

const menuItemClass =
  "flex h-11 w-full cursor-pointer items-center gap-2 rounded-control px-2.5 text-left text-[15px] font-normal text-text-muted transition-[background-color,color] active:bg-bg-selected hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:h-8 md:rounded-compact md:px-2 md:text-sm";

interface SideBarHeaderProps {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}

/**
 * 在侧栏底部呈现账号入口与原有账户操作。
 * @param props 菜单状态和变更回调，用于侧栏收起时保持菜单可点击。
 * @returns 账号入口、菜单及其原有业务弹窗。
 */
const SideBarHeader: React.FC<SideBarHeaderProps> = ({ menuOpen, onMenuOpenChange }) => {
  const { user, logout, updateAvatar } = useAuth();
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [apiTokenModalOpen, setApiTokenModalOpen] = useState(false);
  const confirmation = useRef<ReturnType<typeof confirmDialog> | null>(null);
  useEffect(() => () => confirmation.current?.destroy(), [user?.id]);

  const handleRequestAccountDeletion = () => {
    onMenuOpenChange(false);
    confirmation.current?.destroy();
    confirmation.current = confirmDialog({
      title: "确认注销账号？",
      content: "注销会删除账号、登录会话以及个人数据。继续后需要邮箱验证码验证。",
      okText: "继续验证",
      cancelText: "取消",
      danger: true,
      onOk: () => setDeletionModalOpen(true),
    });
  };

  return (
    <>
      <div className="min-w-0">
        <Popover
          open={menuOpen}
          onOpen={() => onMenuOpenChange(true)}
          onClose={() => onMenuOpenChange(false)}
          trigger={
            <button type="button" aria-label="账户菜单" className="flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-2 rounded-control px-2 py-1 text-left transition-colors active:bg-bg-selected hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:min-h-10">
              <Image
                className="size-8 rounded-full md:size-7"
                src={user?.image || ""}
                defaultLink="/default.jpg"
                alt={user?.name}
              />
              <span className="truncate text-[15px] font-medium text-text-primary md:text-sm">{user?.name}</span>
            </button>
          }
        >
          <div className="w-[184px] space-y-1 p-1.5 md:w-[152px] md:p-1">
            <button type="button" className={menuItemClass} onClick={() => { onMenuOpenChange(false); setAvatarModalOpen(true); }}>
              <Camera size={16} />
              <span>更换头像</span>
            </button>
            <button type="button" className={menuItemClass} onClick={() => { onMenuOpenChange(false); setApiTokenModalOpen(true); }}>
              <KeyRound size={16} />
              <span>密钥管理</span>
            </button>
            <button type="button" className={menuItemClass} onClick={() => { onMenuOpenChange(false); void logout(); }}>
              <LogOut size={16} />
              <span>退出登录</span>
            </button>
            <div className="my-1 border-t border-border-row" aria-hidden="true" />
            <button
              type="button"
              className={menuItemClass + " text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"}
              onClick={handleRequestAccountDeletion}
            >
              <Trash2 size={16} />
              <span>注销账号</span>
            </button>
          </div>
        </Popover>
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
