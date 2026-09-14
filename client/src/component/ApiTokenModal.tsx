import { authClient } from "@/utils/auth";
import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  Select,
  Spin,
  Table,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ApiTokenModalProps = {
  open: boolean;
  onClose: () => void;
};

type ApiTokenItem = {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string | Date;
  lastRequest: string | Date | null;
  expiresAt: string | Date | null;
};

// 有效期选项，值为秒（better-auth apiKey 的 expiresIn 单位），null 表示永久
const EXPIRY_OPTIONS = [
  { label: "30 天", value: 30 * 24 * 60 * 60 },
  { label: "90 天", value: 90 * 24 * 60 * 60 },
  { label: "1 年", value: 365 * 24 * 60 * 60 },
  { label: "永久", value: 0 },
];

const formatTime = (value: string | Date | null | undefined) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : null;

const ApiTokenModal = ({ open, onClose }: ApiTokenModalProps) => {
  const [tokens, setTokens] = useState<ApiTokenItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [expiresIn, setExpiresIn] = useState(0);
  // 新创建 token 的明文，只存组件 state，弹窗关闭即丢弃
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const loadTokens = useCallback(async () => {
    setListLoading(true);
    try {
      const result = await authClient.apiKey.list();
      if (result.error) {
        message.error(result.error.message || "获取 Token 列表失败");
        return;
      }
      setTokens((result.data as ApiTokenItem[]) || []);
    } catch {
      message.error("获取 Token 列表失败");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadTokens();
    } else {
      setTokenName("");
      setExpiresIn(0);
      setCreatedKey(null);
    }
  }, [open, loadTokens]);

  const handleCreate = async () => {
    const name = tokenName.trim();
    if (!name) {
      message.error("请输入 Token 名称");
      return;
    }
    if (name.length > 32) {
      message.error("Token 名称最长 32 个字符");
      return;
    }

    setCreating(true);
    try {
      const result = await authClient.apiKey.create({
        name,
        ...(expiresIn > 0 ? { expiresIn } : {}),
      });
      if (result.error) {
        message.error(result.error.message || "Token 创建失败");
        return;
      }
      setCreatedKey(result.data?.key || null);
      setTokenName("");
      message.success("Token 创建成功");
      loadTokens();
    } catch {
      message.error("Token 创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      message.success("已复制到剪贴板");
    } catch {
      message.error("复制失败，请手动选中复制");
    }
  };

  const handleDelete = (token: ApiTokenItem) => {
    Modal.confirm({
      title: "确认删除该 Token？",
      content: `删除后使用「${token.name || "未命名"}」的外部调用会立即失效。`,
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const result = await authClient.apiKey.delete({ keyId: token.id });
          if (result.error) {
            message.error(result.error.message || "Token 删除失败");
            return;
          }
          message.success("Token 已删除");
          loadTokens();
        } catch {
          message.error("Token 删除失败");
        }
      },
    });
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (name: string | null) => name || "未命名",
    },
    {
      title: "Token",
      dataIndex: "start",
      key: "start",
      render: (start: string | null) => (
        <span className="font-mono">{start ? `${start}••••••` : "••••••"}</span>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string | Date) => formatTime(value),
    },
    {
      title: "最后使用",
      dataIndex: "lastRequest",
      key: "lastRequest",
      render: (value: string | Date | null) => formatTime(value) || "从未使用",
    },
    {
      title: "过期时间",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (value: string | Date | null) => formatTime(value) || "永久",
    },
    {
      title: "操作",
      key: "action",
      width: 72,
      render: (_: unknown, record: ApiTokenItem) => (
        <Button type="link" danger size="small" onClick={() => handleDelete(record)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title="鉴权管理"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      <div className="space-y-4">
        <Typography.Text type="secondary">
          长期 API Token 用于外部程序（如博客、MCP）调用接口，请求时携带
          <Typography.Text code>x-api-key</Typography.Text>
          请求头即可。Token 等同于你的账号凭证，请妥善保管。
        </Typography.Text>

        <div className="flex gap-2">
          <Input
            value={tokenName}
            maxLength={32}
            placeholder="Token 名称（如：博客）"
            onChange={(event) => setTokenName(event.target.value)}
            onPressEnter={handleCreate}
          />
          <Select
            className="w-28 shrink-0"
            value={expiresIn}
            options={EXPIRY_OPTIONS}
            onChange={setExpiresIn}
          />
          <Button
            type="primary"
            className="shrink-0"
            loading={creating}
            onClick={handleCreate}
          >
            生成 Token
          </Button>
        </div>

        {createdKey && (
          <Alert
            type="success"
            showIcon
            message="Token 创建成功，请立即复制保存"
            description={
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-black/5 px-2 py-1 font-mono text-xs">
                    {createdKey}
                  </code>
                  <Button
                    size="small"
                    icon={<Copy size={12} />}
                    onClick={handleCopy}
                  >
                    复制
                  </Button>
                </div>
                <Typography.Text type="warning">
                  出于安全考虑，关闭弹窗后将无法再次查看完整 Token。
                </Typography.Text>
              </div>
            }
          />
        )}

        <Spin spinning={listLoading}>
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={tokens}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="还没有 Token"
                />
              ),
            }}
          />
        </Spin>
      </div>
    </Modal>
  );
};

export default ApiTokenModal;
