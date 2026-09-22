import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import type { ReactElement } from "react";

type MeetingLoginModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onOpenLoginPage: () => void;
  onGitHubLogin: () => Promise<void>;
  onGoogleLogin: () => Promise<void>;
};

export default function MeetingLoginModal({
  open,
  loading,
  onClose,
  onOpenLoginPage,
  onGitHubLogin,
  onGoogleLogin,
}: MeetingLoginModalProps): ReactElement {
  return (
    <Modal
      open={open}
      title="请先登录"
      onCancel={onClose}
      showClose
      className="w-full md:max-w-[420px]"
    >
      <div className="space-y-4 py-4">
        <div>
          <p className="mt-1 text-sm text-text-muted">
            登录后才能校验会议房间权限并进入会议室。
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="primary"
            icon={<LogIn className="size-4" />}
            onClick={onOpenLoginPage}
          >
            前往登录页
          </Button>
          <Button variant="outline"
            loading={loading}
            onClick={() => void onGitHubLogin()}
          >
            使用 GitHub 登录
          </Button>
          <Button variant="outline"
            loading={loading}
            onClick={() => void onGoogleLogin()}
          >
            使用 Google 登录
          </Button>
        </div>
      </div>
    </Modal>
  );
}
