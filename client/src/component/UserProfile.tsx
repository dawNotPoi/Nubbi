import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import AccountDeletionModal from "./AccountDeletionModal";
import Image from "./UI/Image";

/**
 * 展示账户入口和真实可用的账户操作。
 * @returns 账户菜单及注销验证弹窗。
 */
export default function UserProfile(): ReactElement {
  const { user, logout, loading } = useAuth();
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const confirmation = useRef<ReturnType<typeof confirmDialog> | null>(null);
  useEffect(() => () => confirmation.current?.destroy(), [user?.id]);

  /** 打开注销前置确认，继续后仍需邮箱验证码。 */
  const requestDeletion = (): void => {
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

  if (!user) return <Button variant="primary" asChild><Link to="/login">登录</Link></Button>;

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" aria-label="账户菜单" />}>
        <Image src={user.image || ""} defaultLink="/default.jpg" alt={user.name} className="size-6 rounded-full object-cover" />
        <span className="max-w-40 truncate text-sm">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem destructive onClick={requestDeletion}><Trash2 className="size-4" />注销账号</DropdownMenuItem>
        <DropdownMenuItem disabled={loading} onClick={() => void logout()}><LogOut className="size-4" />退出登录</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <AccountDeletionModal open={deletionModalOpen} userEmail={user.email} onClose={() => setDeletionModalOpen(false)} />
  </>;
}
