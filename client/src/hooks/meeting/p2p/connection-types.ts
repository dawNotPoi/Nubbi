import type Peer from "simple-peer";

/** 服务端协调的媒体连接代次，双方只能有一个发起方。 */
export type PeerNegotiation = { connectionId: string; revision: number; initiatorId: string; peerIds: string[] };
/** 带代次的信令；过期信令不得交给新连接。 */
export type MeetingSignal = { senderId: string; connectionId: string; signal: Peer.SignalData };
/** 不包含候选地址、SDP 或凭证的连接诊断。 */
export type PeerConnectionStatus = {
  state: "connecting" | "connected" | "recovering" | "failed";
  attempts: number; elapsedMs: number; reason: string; route?: "direct" | "relay";
};
/** 按参会身份管理的媒体连接状态。 */
export type PeerStatusMap = Record<string, PeerConnectionStatus>;
