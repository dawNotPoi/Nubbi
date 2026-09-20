import { TokenCreateForm } from "@/features/api-token/components/TokenCreateForm";
import { TokenList } from "@/features/api-token/components/TokenList";
import { useApiTokenManager } from "@/features/api-token/hooks/useApiTokenManager";
import type { ApiTokenItem } from "@/features/api-token/model";
import { Alert, Button, Modal, Typography } from "antd";
import { Copy } from "lucide-react";

type ApiTokenModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ApiTokenModal({ open, onClose }: ApiTokenModalProps) {
  const manager = useApiTokenManager(open);

  const confirmDelete = (token: ApiTokenItem) => {
    Modal.confirm({
      title: "确认删除该 Token？",
      content: `删除后使用「${token.name || "未命名"}」的外部调用会立即失效。`,
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => manager.deleteToken(token),
    });
  };

  return (
    <Modal
      destroyOnClose
      footer={null}
      onCancel={onClose}
      open={open}
      title="鉴权管理"
      width={880}
    >
      {manager.contextHolder}
      <div className="space-y-4">
        <Typography.Paragraph className="mb-0 text-text-muted">
          Token 等同于账号凭证。MCP Agent Token 使用固定的笔记权限，通用 API
          Token 保留完整能力；请按接入用途分别创建并妥善保管。
        </Typography.Paragraph>

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
            description={(
              <div className="space-y-2">
                <div className="flex min-w-0 items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-compact bg-bg-selected px-2 py-1 font-mono text-xs">
                    {manager.createdKey}
                  </code>
                  <Button
                    icon={<Copy className="size-3" />}
                    onClick={() => void manager.copyCreatedKey()}
                    size="small"
                  >
                    复制
                  </Button>
                </div>
                <Typography.Text type="warning">
                  关闭弹窗后将无法再次查看完整 Token。
                </Typography.Text>
              </div>
            )}
            message="Token 创建成功，请立即复制保存"
            showIcon
            type="success"
          />
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
