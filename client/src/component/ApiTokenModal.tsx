import { TokenCreateForm } from "@/features/api-token/components/TokenCreateForm";
import { TokenList } from "@/features/api-token/components/TokenList";
import { useApiTokenManager } from "@/features/api-token/hooks/useApiTokenManager";
import type { ApiTokenItem } from "@/features/api-token/model";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Copy } from "lucide-react";
import { useEffect, useRef, type ReactElement } from "react";
import { useAuth } from "@/hooks/useAuth";

type ApiTokenModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * 展示真实权限和仅创建后可见的 Token 密钥。
 * @param props 弹窗开关与关闭回调。
 * @returns Token 管理弹窗。
 */
export default function ApiTokenModal({ open, onClose }: ApiTokenModalProps): ReactElement {
  const manager = useApiTokenManager(open);
  const { user } = useAuth();
  const confirmation = useRef<ReturnType<typeof confirmDialog> | null>(null);
  useEffect(() => () => confirmation.current?.destroy(), [user?.id, open]);

  /** 删除前说明外部调用会失效，失败时保留确认框。 */
  const confirmDelete = (token: ApiTokenItem): void => {
    confirmation.current?.destroy();
    confirmation.current = confirmDialog({
      title: "确认删除该 Token？",
      content: `删除后使用「${token.name || "未命名"}」的外部调用会立即失效。`,
      okText: "删除",
      cancelText: "取消",
      danger: true,
      onOk: () => manager.deleteToken(token),
    });
  };

  return (
    <Modal
      footer={null}
      onCancel={onClose}
      open={open}
      confirmLoading={manager.creating || manager.deletingId !== null}
      title="鉴权管理"
      width={880}
    >
      <div className="space-y-4">
        <p className="mb-0 text-sm text-text-muted">
          Token 等同于账号凭证。MCP Agent Token 使用固定的笔记权限，通用 API
          Token 保留完整能力；请按接入用途分别创建并妥善保管。
        </p>

        <TokenCreateForm
          creating={manager.creating}
          expiresIn={manager.expiresIn}
          purpose={manager.purpose}
          tokenName={manager.tokenName}
          onCreate={() => void manager.createToken()}
          onExpiresInChange={manager.setExpiresIn}
          onPurposeChange={manager.setPurpose}
          onTokenNameChange={manager.setTokenName}
        />

        {manager.createdKey ? (
          <Alert
            title="Token 创建成功，请立即复制保存"
            tone="success"
          >
              <div className="space-y-2">
                <div className="flex min-w-0 items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-compact bg-bg-selected px-2 py-1 font-mono text-xs">
                    {manager.createdKey}
                  </code>
                  <Button
                    icon={<Copy className="size-3" />}
                    onClick={() => void manager.copyCreatedKey()}
                    size="sm"
                  >
                    复制
                  </Button>
                </div>
                <p className="text-[var(--status-inbox-text)]">
                  关闭弹窗后将无法再次查看完整 Token。
                </p>
              </div>
          </Alert>
        ) : null}

        <TokenList
          deletingId={manager.deletingId}
          loading={manager.listLoading}
          onDelete={confirmDelete}
          tokens={manager.tokens}
        />
      </div>
    </Modal>
  );
}
