import { useAuth } from "@/hooks/useAuth";
import { Alert, Button, Input, Modal, Typography, message } from "antd";
import { useEffect, useState } from "react";

type AccountDeletionModalProps = {
  open: boolean;
  userEmail?: string;
  onClose: () => void;
};

const AccountDeletionModal = ({
  open,
  userEmail,
  onClose,
}: AccountDeletionModalProps) => {
  const { requestAccountDeletionCode, deleteAccount, loading } = useAuth();
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState(userEmail || "");

  useEffect(() => {
    setEmail(userEmail || "");
  }, [userEmail]);

  useEffect(() => {
    if (!open) {
      setCode("");
      setCooldown(0);
      setSendingCode(false);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((currentValue) => (currentValue > 0 ? currentValue - 1 : 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleSendCode = async () => {
    if (sendingCode || cooldown > 0) {
      return;
    }

    setSendingCode(true);
    const result = await requestAccountDeletionCode();
    setSendingCode(false);

    if (!result.success) {
      message.error(result.error?.message || "验证码发送失败");
      if (result.data?.remainingSeconds) {
        setCooldown(result.data.remainingSeconds);
      }
      return;
    }

    setEmail(result.data?.email || userEmail || "");
    setCooldown(result.data?.cooldownSeconds || 60);
    message.success("注销验证码已发送，请检查邮箱。");
  };

  const handleConfirmDeletion = async () => {
    if (!/^\d{6}$/.test(code)) {
      message.error("请输入 6 位数字验证码");
      return;
    }

    const result = await deleteAccount(code);
    if (!result.success) {
      message.error(result.error?.message || "账号注销失败");
      return;
    }

    message.success("账号已注销");
    onClose();
  };

  return (
    <Modal
      title="注销账号"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="delete"
          danger
          type="primary"
          loading={loading}
          onClick={handleConfirmDeletion}
        >
          确认注销
        </Button>,
      ]}
      destroyOnClose
    >
      <div className="space-y-4">
        <Alert
          type="warning"
          showIcon
          message="账号注销后不可恢复"
          description="你的账号、登录会话以及个人笔记和文件记录将被删除。"
        />

        <div className="space-y-2">
          <Typography.Text type="secondary">
            验证码将发送至 {email || "当前账号邮箱"}
          </Typography.Text>
          <div className="flex gap-2">
            <Input
              value={code}
              maxLength={6}
              inputMode="numeric"
              placeholder="请输入 6 位数字验证码"
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              }}
            />
            <Button
              className="shrink-0"
              loading={sendingCode}
              disabled={cooldown > 0}
              onClick={handleSendCode}
            >
              {cooldown > 0 ? `${cooldown}s` : "获取验证码"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AccountDeletionModal;
