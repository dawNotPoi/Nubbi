import { Modal } from "@/component/UI/Dialog";
import { Button } from "antd";
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
      onCancel={onClose}
      showClose
      className="w-full md:mt-[20vh] md:w-[min(90vw,420px)]"
    >
      <div className="space-y-4 py-4">
        <div>
          <h3 className="text-lg font-semibold">请先登录</h3>
          <p className="mt-1 text-sm text-slate-500">
            登录后才能校验会议房间权限并进入会议室。
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            icon={<LogIn className="size-4" />}
            onClick={onOpenLoginPage}
          >
            前往登录页
          </Button>
          <Button
            loading={loading}
            onClick={() => void onGitHubLogin()}
          >
            使用 GitHub 登录
          </Button>
          <Button
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
