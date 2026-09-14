import type { ReactElement } from "react";
import type { PeerStatusMap } from "@/hooks/meeting/p2p/connection-types";
import type { RoomUserMap } from "@/hooks/meeting/p2p/types";

/** @param props 每位成员的真实媒体状态及独立重试操作。@returns 可折叠诊断，不展示敏感信令。 */
export function ConnectionDiagnostics({ statuses, users, onRetry, online, iceWarning }: { statuses: PeerStatusMap; users: RoomUserMap; onRetry: (peerId: string) => void; online: boolean; iceWarning: string }): ReactElement {
  const entries = Object.entries(statuses);
  const connected = entries.filter(([, status]) => status.state === "connected").length;
  return <details className="max-h-40 shrink-0 overflow-auto border-b border-border-row px-3 py-2 text-xs text-text-muted">
    <summary className="cursor-pointer" aria-live="polite">媒体连接：{connected}/{entries.length}{entries.some(([, status]) => status.state === "failed") ? " · 有连接失败，可展开重试" : ""}{iceWarning ? " · 未配置中继" : ""}</summary>
    {iceWarning && <p className="py-2 text-amber-700">{iceWarning}</p>}
    {!entries.length && <p className="py-2">等待其他成员加入，房间加入成功不代表已有媒体连接。</p>}
    {entries.map(([peerId, status]) => <div key={peerId} className="flex flex-wrap items-center gap-2 py-1">
      <span className="font-medium text-text-primary">{users[peerId]?.name || "参会成员"}</span>
      <span>{status.reason} · {(status.elapsedMs / 1000).toFixed(1)} 秒 · 重试 {status.attempts} 次{status.route ? ` · ${status.route === "relay" ? "中继" : "直连"}` : ""}</span>
      {status.state === "failed" && <button disabled={!online} onClick={() => onRetry(peerId)} className="rounded border border-border-button px-2 py-1 text-accent-text disabled:opacity-50">重试此连接</button>}
    </div>)}
  </details>;
}
