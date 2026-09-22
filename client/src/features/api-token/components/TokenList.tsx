import { getTokenPermissionLabels, getTokenPurpose, type ApiTokenItem } from "../model";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import dayjs from "dayjs";
import type { ReactElement } from "react";

type TokenListProps = {
  deletingId: string | null;
  loading: boolean;
  tokens: ApiTokenItem[];
  onDelete: (token: ApiTokenItem) => void;
};

/** 将可选时间转换为本地可读文本。 */
const formatTime = (value: string | Date | null): string | null => value ? dayjs(value).format("YYYY-MM-DD HH:mm") : null;

/**
 * 保留用途、权限和有效期信息；窄屏用卡片避免横向滚动。
 * @param props 列表数据、加载状态和删除入口。
 * @returns 可访问的 Token 列表。
 */
export function TokenList({ deletingId, loading, onDelete, tokens }: TokenListProps): ReactElement {
  if (loading) return <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted"><Spinner />正在加载 Token…</div>;
  if (!tokens.length) return <p className="py-8 text-center text-sm text-text-muted">还没有 Token</p>;

  /** 为桌面行和手机卡片生成一致的权限说明。 */
  const permissionText = (token: ApiTokenItem): string => getTokenPermissionLabels(token).join("、") || "完整账号权限";
  /** 删除仍经由父级确认框，不在列表直接调用接口。 */
  const deleteButton = (token: ApiTokenItem): ReactElement => <Button variant="ghost" className="text-[var(--danger-text)] hover:bg-[var(--danger-bg)] max-md:min-h-11" size="sm" loading={deletingId === token.id} disabled={deletingId !== null} onClick={() => onDelete(token)} aria-label={`删除 ${token.name || "未命名"} Token`}>删除</Button>;

  return <>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">已创建的 API Token</caption>
        <thead><tr className="border-b border-border-row text-text-muted">{["名称 / Token", "用途", "权限", "最后使用", "过期时间", "操作"].map((title) => <th scope="col" key={title} className="px-2 py-2 font-medium">{title}</th>)}</tr></thead>
        <tbody>{tokens.map((token) => <tr key={token.id} className="border-b border-border-row">
          <th scope="row" className="max-w-40 break-words px-2 py-3 font-normal"><div>{token.name || "未命名"}</div><code className="text-xs text-text-subtle">{token.start || ""}••••••</code></th>
          <td className="px-2 py-3">{getTokenPurpose(token) === "mcp" ? "MCP Agent" : "通用 API"}</td>
          <td className="max-w-52 px-2 py-3 text-xs text-text-muted">{permissionText(token)}</td>
          <td className="px-2 py-3 text-xs">{formatTime(token.lastRequest) || "从未使用"}</td>
          <td className="px-2 py-3 text-xs">{formatTime(token.expiresAt) || "永久"}</td>
          <td className="px-2 py-3">{deleteButton(token)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <ul className="space-y-3 md:hidden">{tokens.map((token) => <li key={token.id} className="rounded-control border border-border-row p-3 text-sm">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words font-medium">{token.name || "未命名"}</h3><code className="break-all text-xs text-text-subtle">{token.start || ""}••••••</code></div>{deleteButton(token)}</div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs"><dt className="text-text-muted">用途</dt><dd>{getTokenPurpose(token) === "mcp" ? "MCP Agent" : "通用 API"}</dd><dt className="text-text-muted">权限</dt><dd>{permissionText(token)}</dd><dt className="text-text-muted">最后使用</dt><dd>{formatTime(token.lastRequest) || "从未使用"}</dd><dt className="text-text-muted">过期时间</dt><dd>{formatTime(token.expiresAt) || "永久"}</dd></dl>
    </li>)}</ul>
  </>;
}
