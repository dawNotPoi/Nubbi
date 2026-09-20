import type { ReactElement } from "react";
import type { PeerStatusMap } from "@/hooks/meeting/p2p/connection-types";
import type { RoomUserMap } from "@/hooks/meeting/p2p/types";

type ConnectionDiagnosticsProps = {
  statuses: PeerStatusMap;
  users: RoomUserMap;
  localPeerId: string;
  onRetry: (peerId: string) => void;
  online: boolean;
  iceWarning: string;
};

/**
 * 默认解释谁受影响、能做什么，底层统计只在用户主动展开时出现。
 * @param props 当前成员、媒体状态、信令可用性和单连接重试操作。
 * @returns 不抢焦点的状态摘要与可展开技术诊断。
 */
export function ConnectionDiagnostics({ statuses, users, localPeerId, onRetry, online, iceWarning }: ConnectionDiagnosticsProps): ReactElement {
  const members = Object.values(users).filter((member) => member.peerId !== localPeerId);
  const connectedMembers = members.filter((member) => statuses[member.peerId]?.state === "connected");
  const affectedMembers = members.filter((member) => {
    const state = statuses[member.peerId]?.state;
    return state === "failed" || state === "recovering";
  });
  const connectingCount = members.length - connectedMembers.length - affectedMembers.length;
  const summary = !online ? (members.length ? "正在恢复会议信息，已建立的音视频连接可能仍可使用。" : "正在连接会议，请稍候。") :
    !members.length ? "已加入会议，等待其他成员加入。" :
    affectedMembers.length ? `${affectedMembers.length} 位成员的媒体连接需要关注。` :
    connectingCount ? `正在与 ${connectingCount} 位成员建立音视频连接…` : "与所有成员的音视频连接正常。";

  return <section aria-label="会议连接状态" className="shrink-0 border-b border-border-row px-3 py-2 text-xs">
    <div role="status" aria-live="polite" aria-atomic="true" className="text-text-muted">
      {summary}
      {online && affectedMembers.length > 0 && connectedMembers.length > 0 && " 其他已连通成员可继续通话。"}
    </div>
    {online && affectedMembers.length > 0 && <ul className="mt-1 max-h-24 overflow-y-auto">
      {affectedMembers.map((member) => {
        const failed = statuses[member.peerId]?.state === "failed";
        return <li key={member.peerId} className="flex flex-wrap items-center justify-between gap-2 py-1">
          <span className={failed ? "text-amber-700" : "text-text-muted"}>
            {failed ? `与 ${member.name || "该成员"} 的音视频连接失败。` : `正在恢复与 ${member.name || "该成员"} 的连接，请稍候。`}
          </span>
          {failed && <button type="button" aria-label={`重试与 ${member.name || "该成员"} 的连接`}
            onClick={() => onRetry(member.peerId)}
            className="min-h-9 rounded-control border border-border-button px-3 text-accent-text focus-visible:ring-2 focus-visible:ring-focus-ring">
            重试
          </button>}
        </li>;
      })}
    </ul>}
    <details className="mt-1 text-text-muted">
      <summary className="w-fit cursor-pointer py-1">连接详情</summary>
      <div className="max-h-32 overflow-y-auto">
        {iceWarning && <p className="py-1 text-amber-700">{iceWarning}</p>}
        {!members.length && <p className="py-1">尚无远端连接需要诊断。</p>}
        {members.map((member) => {
          const status = statuses[member.peerId];
          return <p key={member.peerId} className="flex flex-wrap gap-x-2 py-1">
            <span>{member.name || "参会成员"}</span>
            <span>{status?.reason || "等待媒体协商"}</span>
            {status && <span>{(status.elapsedMs / 1000).toFixed(1)} 秒 · 重试 {status.attempts} 次
              {status.route ? ` · ${status.route === "relay" ? "中继" : "直连"}` : ""}</span>}
          </p>;
        })}
      </div>
    </details>
  </section>;
}
