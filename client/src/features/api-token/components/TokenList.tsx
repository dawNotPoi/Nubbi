import {
  getTokenPermissionLabels,
  getTokenPurpose,
  type ApiTokenItem,
} from "../model";
import { Button, Empty, Table, type TableColumnsType } from "antd";
import dayjs from "dayjs";

type TokenListProps = {
  deletingId: string | null;
  loading: boolean;
  tokens: ApiTokenItem[];
  onDelete: (token: ApiTokenItem) => void;
};

const formatTime = (value: string | Date | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : null;

const Badge = ({ children, accent = false }: { children: string; accent?: boolean }) => (
  <span
    className={accent
      ? "rounded border border-accent-border/20 bg-accent-bg px-1.5 py-0.5 text-xs text-accent-text"
      : "rounded border border-border-toolbar bg-bg-panel px-1.5 py-0.5 text-xs text-text-muted"}
  >
    {children}
  </span>
);

export function TokenList({ deletingId, loading, onDelete, tokens }: TokenListProps) {
  const columns: TableColumnsType<ApiTokenItem> = [
    {
      dataIndex: "name",
      key: "name",
      title: "名称 / Token",
      width: 150,
      render: (_value, token) => (
        <div className="min-w-0">
          <div className="truncate text-text-primary">{token.name || "未命名"}</div>
          <div className="truncate font-mono text-xs text-text-subtle">
            {token.start ? `${token.start}••••••` : "••••••"}
          </div>
        </div>
      ),
    },
    {
      key: "purpose",
      title: "用途",
      width: 96,
      render: (_value, token) => (
        <Badge accent={getTokenPurpose(token) === "mcp"}>
          {getTokenPurpose(token) === "mcp" ? "MCP Agent" : "通用 API"}
        </Badge>
      ),
    },
    {
      key: "permissions",
      title: "权限",
      width: 230,
      render: (_value, token) => {
        const labels = getTokenPermissionLabels(token);
        return labels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {labels.map((label) => <Badge key={label}>{label}</Badge>)}
          </div>
        ) : <Badge>完整账号权限</Badge>;
      },
    },
    {
      dataIndex: "lastRequest",
      key: "lastRequest",
      title: "最后使用",
      width: 140,
      render: (value: string | Date | null) => formatTime(value) || "从未使用",
    },
    {
      dataIndex: "expiresAt",
      key: "expiresAt",
      title: "过期时间",
      width: 140,
      render: (value: string | Date | null) => formatTime(value) || "永久",
    },
    {
      key: "action",
      title: "操作",
      width: 64,
      render: (_value, token) => (
        <Button
          danger
          loading={deletingId === token.id}
          onClick={() => onDelete(token)}
          size="small"
          type="link"
        >
          删除
        </Button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={tokens}
      loading={loading}
      locale={{
        emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有 Token" />,
      }}
      pagination={false}
      rowKey="id"
      scroll={{ x: 820 }}
      size="small"
    />
  );
}
