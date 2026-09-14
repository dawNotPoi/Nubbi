import type Peer from "simple-peer";

/** 服务端协调的媒体连接代次，双方只能有一个发起方。 */
export type PeerNegotiation = {
  /** 每次重建生成的新身份，旧连接的信令不可复用。 */
  connectionId: string;
  /** 同一对成员递增的版本，用于忽略重复或迟到的协商通知。 */
  revision: number;
  initiatorId: string;
  peerIds: string[];
};
/** 带代次的信令；过期信令不得交给新连接。 */
export type MeetingSignal = {
  senderId: string;
  connectionId: string;
  signal: Peer.SignalData;
};
/** 不包含候选地址、SDP 或凭证的连接诊断。 */
export type PeerConnectionStatus = {
  state: "connecting" | "connected" | "recovering" | "failed";
  /** 当前成员已消耗的自动恢复次数，不是整个房间的重试次数。 */
  attempts: number;
  elapsedMs: number;
  reason: string;
  /** 只在统计可用时提供；未提供不等于直连。 */
  route?: "direct" | "relay";
};
/** 按参会身份管理的媒体连接状态。 */
export type PeerStatusMap = Record<string, PeerConnectionStatus>;
