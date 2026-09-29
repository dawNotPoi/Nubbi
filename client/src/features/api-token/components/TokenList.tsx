import { getTokenPermissionLabels, getTokenPurpose, type ApiTokenItem } from "../model";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { KeyRound } from "lucide-react";
import dayjs from "dayjs";
import type { ReactElement } from "react";

type TokenListProps = {
  deletingId: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  tokens: ApiTokenItem[];
  onDelete: (token: ApiTokenItem) => void;
};

/** 将可选时间转换为本地可读文本。 */
const formatTime = (value: string | Date | null): string | null => value ? dayjs(value).format("YYYY-MM-DD HH:mm") : null;

/**
 * 用卡片展示掩码与权限详情，删除仍经过父级确认流程。
 * @param props 列表数据、加载状态和删除入口。
 * @returns 密钥列表。
 */
export function TokenList({ deletingId, loading, error, onRetry, onDelete, tokens }: TokenListProps): ReactElement {
  return (
    <section aria-labelledby="token-list-title">
      <div className="mb-3 flex items-center gap-2">
        <h2 id="token-list-title" className="text-sm font-semibold">已有密钥</h2>
        {!loading && !error ? <span className="rounded-compact bg-bg-selected px-2 py-0.5 text-xs text-text-muted">{tokens.length}</span> : null}
      </div>
      {error ? <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border-row p-4">
        <div role="alert" className="text-sm text-text-muted"><p>{error}</p>{tokens.length > 0 ? <p className="mt-1 text-xs">以下为上次加载的密钥，数据可能尚未更新。</p> : null}</div>
        <Button variant="outline" size="sm" disabled={loading} loading={loading} onClick={onRetry}>重试</Button>
      </div> : null}
      {loading && !tokens.length && !error ? <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted"><Spinner />正在加载密钥…</div> : !tokens.length && !error && !loading ? (
        <div className="flex items-center gap-3 rounded-panel border border-dashed border-border-button p-5">
          <KeyRound aria-hidden="true" className="size-5 shrink-0 text-text-muted" />
          <div><p className="text-sm font-medium">还没有密钥</p><p className="mt-1 text-xs text-text-muted">选择用途，创建第一个接入凭证。</p></div>
        </div>
      ) : tokens.length > 0 ? <ul className="space-y-3">{tokens.map((token) => (
        <li key={token.id} className="rounded-panel border border-border-row bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-sm font-medium [overflow-wrap:anywhere]">{token.name || "未命名"}</h3>
                <span className="rounded-compact bg-bg-selected px-2 py-1 text-[11px] text-text-muted">{getTokenPurpose(token) === "mcp" ? "MCP Agent" : "通用 API"}</span>
              </div>
              <code className="mt-1.5 block break-all text-xs text-text-muted">{token.start || ""}••••••</code>
            </div>
            <Button variant="ghost" className="shrink-0 text-[var(--danger-text)] hover:bg-[var(--danger-bg)]" size="sm" loading={deletingId === token.id} disabled={deletingId !== null} onClick={() => onDelete(token)} aria-label={`删除 ${token.name || "未命名"} Token`}>删除</Button>
          </div>
          <p className="mt-3 break-words text-xs leading-5 text-text-muted">权限：{getTokenPermissionLabels(token).join("、") || "完整账号权限"}</p>
          <dl className="mt-3 grid gap-2 border-t border-border-row pt-3 text-xs sm:grid-cols-2">
            <div><dt className="inline text-text-muted">最后使用</dt><dd className="ml-2 inline">{formatTime(token.lastRequest) || "从未使用"}</dd></div>
            <div><dt className="inline text-text-muted">过期时间</dt><dd className="ml-2 inline">{formatTime(token.expiresAt) || "永久"}</dd></div>
          </dl>
        </li>
      ))}</ul> : null}
    </section>
  );
}
