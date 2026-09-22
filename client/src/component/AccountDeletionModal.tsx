import { useAuth } from "@/hooks/useAuth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/dialog";
import { toast as message } from "@/components/ui/toast";
import { useEffect, useState, type ReactElement } from "react";

type AccountDeletionModalProps = {
  open: boolean;
  userEmail?: string;
  onClose: () => void;
};

/**
 * 保留不可恢复提示、主动勾选和邮箱验证码三层注销确认。
 * @param props 弹窗状态、当前邮箱与关闭回调。
 * @returns 注销账号验证弹窗。
 */
const AccountDeletionModal = ({
  open,
  userEmail,
  onClose,
}: AccountDeletionModalProps): ReactElement => {
  const { requestAccountDeletionCode, deleteAccount, loading } = useAuth();
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState(userEmail || "");
  const [confirmedDeletion, setConfirmedDeletion] = useState(false);

  useEffect(() => {
    setEmail(userEmail || "");
  }, [userEmail]);

  useEffect(() => {
    if (!open) {
      setCode("");
      setCooldown(0);
      setSendingCode(false);
      setConfirmedDeletion(false);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((currentValue) => (currentValue > 0 ? currentValue - 1 : 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  /** 发送验证码并沿用服务端冷却时间。 */
  const handleSendCode = async (): Promise<void> => {
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

  /** 校验主动确认和验证码后提交注销。 */
  const handleConfirmDeletion = async (): Promise<void> => {
    if (loading) return;
    if (!confirmedDeletion) {
      message.error("请先确认已了解注销后果");
      return;
    }

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
      confirmLoading={loading}
      footer={<div className="mt-5 flex justify-end gap-2">
        <Button className="max-md:h-11" disabled={loading} onClick={onClose}>
          取消
        </Button>
        <Button
          className="max-md:h-11"
          variant="destructive"
          loading={loading}
          disabled={!confirmedDeletion || !/^\d{6}$/.test(code)}
          onClick={handleConfirmDeletion}
        >
          确认注销
        </Button>
      </div>}
    >
      <div className="space-y-4">
        <Alert
          tone="warning"
          title="账号注销后不可恢复"
        >你的账号、登录会话以及个人笔记和文件记录将被删除。</Alert>

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={confirmedDeletion}
            onCheckedChange={setConfirmedDeletion}
          />
          我确认要注销当前账号，并了解该操作不可恢复。
        </label>

        <div className="space-y-2">
          <p className="text-sm text-text-muted">
            验证码将发送至 {email || "当前账号邮箱"}
          </p>
          <div className="flex gap-2">
            <Input
              aria-label="注销验证码"
              className="min-w-0 pl-3 max-md:h-11"
              value={code}
              maxLength={6}
              inputMode="numeric"
              placeholder="请输入 6 位数字验证码"
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              }}
            />
            <Button
              className="shrink-0 max-md:h-11"
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
