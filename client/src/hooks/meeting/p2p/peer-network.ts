import type { Socket } from "socket.io-client";
import type { MeetingSignal, PeerNegotiation, PeerStatusMap } from "./connection-types";
import { PeerSession } from "./peer-session";
import { requestAcknowledgement } from "./request-acknowledgement";

type NetworkOptions = { socket: () => Socket | null; onStreams: (streams: Record<string, MediaStream>) => void; onStatus: (status: PeerStatusMap) => void };
const MAX_RECOVERY_ATTEMPTS = 3;

/** 协调每位成员的连接、有限重试和过期信令隔离，不控制本地设备权限。 */
export class PeerNetwork {
  private sessions = new Map<string, PeerSession>();
  private members = new Set<string>();
  private status: PeerStatusMap = {};
  private streams: Record<string, MediaStream> = {};
  private attempts = new Map<string, number>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private requests = new Set<string>();
  private pendingSessions = new Map<string, PeerNegotiation>();
  private pendingSignals: MeetingSignal[] = [];
  private iceServers: RTCIceServer[] = [];
  private stream: MediaStream | null = null;
  private ready = false;
  private epoch = 0;

  /** @param options 最新 Socket 访问器和外部状态发布器。 */
  constructor(private readonly options: NetworkOptions) {}

  /** @param iceServers 授权入会后获得的配置。@returns 无；配置就绪才创建 Peer。 */
  configure(iceServers: RTCIceServer[]): void {
    this.iceServers = iceServers; this.ready = true;
    for (const session of this.pendingSessions.values()) this.acceptSession(session);
    this.pendingSessions.clear();
  }

  /** @returns 无；短断期间只暂停协商，保留健康媒体和有限恢复预算。 */
  suspend(): void { this.ready = false; }

  /** @param peerIds 当前房间成员快照。@returns 无；保留健康连接，只修复缺失连接。 */
  reconcile(peerIds: string[]): void {
    const localId = this.options.socket()?.id;
    const members = new Set(peerIds.filter((id) => id !== localId));
    for (const peerId of this.members) if (!members.has(peerId)) this.remove(peerId);
    this.members = members;
    for (const peerId of members) {
      const session = this.sessions.get(peerId);
      if (this.status[peerId]?.state === "failed" || this.timers.has(peerId)) continue;
      if (!session || session.peer.destroyed) void this.negotiate(peerId, session?.negotiation.connectionId);
    }
  }

  /** @param peerId 要连接的成员。@param expectedConnectionId 仅替换此旧代次。@returns 无；同一成员只有一个在途请求。 */
  private async negotiate(peerId: string, expectedConnectionId?: string): Promise<void> {
    const socket = this.options.socket();
    if (!this.ready || !socket?.connected || this.requests.has(peerId) || !this.members.has(peerId)) return;
    this.requests.add(peerId);
    const epoch = this.epoch;
    const response = await requestAcknowledgement<{ ok: boolean; session: PeerNegotiation; iceServers: RTCIceServer[] }>(socket, "negotiateMeetingPeer", { targetId: peerId, expectedConnectionId });
    if (epoch !== this.epoch) return;
    this.requests.delete(peerId);
    if (!this.members.has(peerId)) return;
    if (response.ok && response.value.ok) {
      this.iceServers = response.value.iceServers;
      this.acceptSession(response.value.session);
    } else this.scheduleRecovery(peerId);
  }

  /** @param session 服务端的单调递增协商结果。@param iceServers 本成员的新临时凭证。@returns 无；重复结果不重建健康连接。 */
  acceptSession(session: PeerNegotiation, iceServers?: RTCIceServer[]): void {
    if (iceServers) this.iceServers = iceServers;
    const localId = this.options.socket()?.id;
    const peerId = session.peerIds.find((id) => id !== localId);
    if (!localId || !peerId || !session.peerIds.includes(localId)) return;
    if (!this.ready) {
      const previous = this.pendingSessions.get(peerId);
      if (this.pendingSessions.size < 64 && (!previous || previous.revision < session.revision)) this.pendingSessions.set(peerId, session);
      return;
    }
    this.members.add(peerId);
    const previous = this.sessions.get(peerId);
    if (previous && previous.negotiation.revision >= session.revision) return;
    previous?.dispose();
    delete this.streams[peerId]; this.options.onStreams({ ...this.streams });
    clearTimeout(this.timers.get(peerId)); this.timers.delete(peerId);
    const epoch = this.epoch;
    const owns = (): boolean => epoch === this.epoch && this.sessions.get(peerId)?.negotiation.connectionId === session.connectionId;
    let next: PeerSession;
    try { next = new PeerSession({ negotiation: session, localId, iceServers: this.iceServers, stream: this.stream,
      send: (data) => { const socket = this.options.socket(); if (owns() && socket?.connected && socket.id === localId) socket.emit("signal", { targetId: peerId, connectionId: data.connectionId, signal: data.signal }); },
      onStream: (stream) => { if (!owns()) return; if (stream) this.streams[peerId] = stream; else delete this.streams[peerId]; this.options.onStreams({ ...this.streams }); },
      onStatus: (status) => { if (epoch !== this.epoch) return; this.status[peerId] = { ...status, attempts: this.attempts.get(peerId) ?? 0 }; this.publish(); },
      onFailure: () => { if (owns()) this.scheduleRecovery(peerId); },
    }); } catch { this.exhausted(peerId); return; }
    this.sessions.set(peerId, next);
    const signals = this.pendingSignals;
    this.pendingSignals = signals.filter((signal) => signal.senderId !== peerId);
    for (const signal of signals) if (signal.senderId === peerId && signal.connectionId === session.connectionId) next.accept(signal.signal);
  }

  /** @param data 带连接代次的信令。@returns 无；仅有限缓存先于协商通知到达的信令。 */
  acceptSignal(data: MeetingSignal): void {
    const session = this.sessions.get(data.senderId);
    if (session?.negotiation.connectionId === data.connectionId) { session.accept(data.signal); return; }
    if (this.pendingSignals.length < 128) this.pendingSignals.push(data);
  }

  /** @param peerId 失败的成员。@returns 无；退避有上限，断线期间不发送。 */
  private scheduleRecovery(peerId: string): void {
    if (!this.members.has(peerId) || this.timers.has(peerId)) return;
    const attempts = this.attempts.get(peerId) ?? 0;
    if (attempts >= MAX_RECOVERY_ATTEMPTS) { this.exhausted(peerId); return; }
    this.attempts.set(peerId, attempts + 1);
    this.status[peerId] = { state: "recovering", attempts: attempts + 1, reason: "等待重新协商媒体连接", elapsedMs: this.status[peerId]?.elapsedMs ?? 0 }; this.publish();
    this.timers.set(peerId, setTimeout(() => {
      this.timers.delete(peerId);
      void this.negotiate(peerId, this.sessions.get(peerId)?.negotiation.connectionId);
    }, 1000 * 2 ** attempts + Math.random() * 300));
  }

  /** @param peerId 耗尽恢复预算的成员。@returns 无；等待显式手动重试。 */
  private exhausted(peerId: string): void {
    this.status[peerId] = { ...this.status[peerId], state: "failed", attempts: this.attempts.get(peerId) ?? 0, elapsedMs: this.status[peerId]?.elapsedMs ?? 0, reason: "自动恢复未成功，请重试或检查 TURN 配置" };
    this.publish();
  }

  /** @param peerId 用户选定的失败连接。@returns 无；不影响其他成员。 */
  retry(peerId: string): void {
    if (!this.members.has(peerId) || this.status[peerId]?.state !== "failed") return;
    this.attempts.set(peerId, 0);
    void this.negotiate(peerId, this.sessions.get(peerId)?.negotiation.connectionId);
  }

  /** @param stream 本地媒体。@returns 无；轨道变化不会重建健康连接。 */
  update(stream: MediaStream | null): void {
    this.stream = stream;
    if (stream) for (const session of this.sessions.values()) session.update(stream);
  }

  /** @param peerId 已离开的成员。@returns 无；清理媒体、重试和诊断。 */
  remove(peerId: string): void {
    this.members.delete(peerId); this.sessions.get(peerId)?.dispose(); this.sessions.delete(peerId);
    clearTimeout(this.timers.get(peerId)); this.timers.delete(peerId);
    this.attempts.delete(peerId); this.pendingSessions.delete(peerId);
    this.pendingSignals = this.pendingSignals.filter((signal) => signal.senderId !== peerId);
    delete this.streams[peerId]; delete this.status[peerId];
    this.options.onStreams({ ...this.streams }); this.publish();
  }

  /** @returns 无；批量更新不可变诊断快照。 */
  private publish(): void { this.options.onStatus({ ...this.status }); }

  /** @returns 无；身份改变、离会或宽限到期后释放所有连接。 */
  reset(): void {
    this.epoch++; this.ready = false;
    for (const peerId of this.members) this.remove(peerId);
    this.pendingSessions.clear(); this.pendingSignals = []; this.requests.clear();
    this.stream = null;
  }
}
