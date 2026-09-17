import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/utils/routes";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetRow,
  SheetSeparator,
  SheetTitle,
} from "@/components/ui/sheet";
import { Modal } from "antd";
import {
  Camera,
  KeyRound,
  LogOut,
  Presentation,
  Trash2,
  UserRoundX,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AccountDeletionModal from "./AccountDeletionModal";
import ApiTokenModal from "./ApiTokenModal";
import ChangeAvatarModal from "./ChangeAvatarModal";
import Image from "./UI/Image";

type MobileMoreSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** 手机端低频全局入口。Desktop Sidebar 不复用这套布局。 */
export default function MobileMoreSheet({ open, onOpenChange }: MobileMoreSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateAvatar } = useAuth();
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [apiTokenModalOpen, setApiTokenModalOpen] = useState(false);
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path, {
      state: {
        mobileReturnTo: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  };

  const handleLogout = () => {
    onOpenChange(false);
    void logout();
  };

  const requestAccountDeletion = () => {
    onOpenChange(false);
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent showClose>
          <SheetHeader>
            <SheetTitle>更多</SheetTitle>
            <SheetDescription>低频工具、账户与管理入口</SheetDescription>
          </SheetHeader>

          <div className="space-y-0.5">
            <SheetRow onClick={() => go(routes.meetings)}>
              <span className="grid size-8 shrink-0 place-items-center rounded-[7px] bg-[var(--entity-meeting-soft)] text-[var(--entity-meeting)]">
                <Presentation className="size-[18px]" />
              </span>
              <span className="flex-1">会议</span>
            </SheetRow>
            <SheetRow onClick={() => go(routes.noteTrash)}>
              <span className="grid size-8 shrink-0 place-items-center rounded-[7px] bg-[var(--danger-bg)] text-[var(--danger-text)]">
                <Trash2 className="size-[18px]" />
              </span>
              <span className="flex-1">回收站</span>
            </SheetRow>
          </div>

          <SheetSeparator />

          <div className="flex min-h-14 items-center gap-3 px-2.5 py-1">
            <Image
              alt={user?.name || "用户头像"}
              className="size-9 rounded-[8px] object-cover"
              defaultLink="/default.jpg"
              src={user?.image || ""}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium text-text-primary">{user?.name || "Nubbi 用户"}</div>
              <div className="truncate text-[12px] text-text-muted">{user?.email}</div>
            </div>
          </div>

          <div className="mt-1 space-y-0.5">
            <SheetRow onClick={() => { onOpenChange(false); setAvatarModalOpen(true); }}>
              <Camera />
              <span>更换头像</span>
            </SheetRow>
            <SheetRow onClick={() => { onOpenChange(false); setApiTokenModalOpen(true); }}>
              <KeyRound />
              <span>鉴权管理</span>
            </SheetRow>
            <SheetRow onClick={handleLogout}>
              <LogOut />
              <span>退出登录</span>
            </SheetRow>
            <SheetRow
              className="text-[var(--danger-text)] [&>svg]:text-[var(--danger-text)] active:bg-[var(--danger-bg)] hover:bg-[var(--danger-bg)]"
              onClick={requestAccountDeletion}
            >
              <UserRoundX />
              <span>注销账号</span>
            </SheetRow>
          </div>
        </SheetContent>
      </Sheet>

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
}
