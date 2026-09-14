import type { Socket } from "socket.io-client";
import type { MeetingSignal, PeerNegotiation, PeerStatusMap } from "./connection-types";
import { PeerSession } from "./peer-session";
import { requestAcknowledgement } from "./request-acknowledgement";

/** 外部只提供信令入口和状态订阅，不参与每条媒体连接的生命周期。 */
type PeerNetworkOptions = {
  socket: () => Socket | null;
  onStreams: (streams: Record<string, MediaStream>) => void;
  onStatus: (status: PeerStatusMap) => void;
};

/** 请求完成不等于协商获准；失败响应不包含连接信息或临时凭证。 */
type NegotiationResponse =
  | { ok: true; session: PeerNegotiation; iceServers: RTCIceServer[] }
  | { ok: false };

const MAX_RECOVERY_ATTEMPTS = 3;
const MAX_PENDING_SESSIONS = 64;
const MAX_PENDING_SIGNALS = 128;
const RECOVERY_BASE_DELAY_MS = 1_000;
const RECOVERY_JITTER_MS = 300;

/**
 * 协调整个房间的媒体连接：成员同步、协商去重、有限重试和旧信令隔离。
 * 单条连接交给 PeerSession，本地设备权限和 Socket 登录由外部负责。
 */
export class PeerNetwork {
  private readonly sessionsByPeerId = new Map<string, PeerSession>();
  private memberIds = new Set<string>();
  private peerStatuses: PeerStatusMap = {};
  private remoteStreams: Record<string, MediaStream> = {};
  private readonly recoveryAttempts = new Map<string, number>();
  private readonly recoveryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly negotiatingPeerIds = new Set<string>();
  private readonly pendingNegotiations = new Map<string, PeerNegotiation>();
  private pendingSignals: MeetingSignal[] = [];
  private iceServers: RTCIceServer[] = [];
  private localStream: MediaStream | null = null;
  private isReady = false;
  /** 全量重置时递增，用来忽略上一个房间生命周期的异步回调。 */
  private lifecycleVersion = 0;

  /**
   * @param options 最新 Socket 访问器和不可变快照的接收器。
   */
  constructor(private readonly options: PeerNetworkOptions) {}

  /**
   * 入会授权完成后恢复协商；不会重建仍然健康的媒体连接。
   * @param iceServers 本成员的 STUN 配置和 TURN 临时凭证。
   * @returns 无；处理授权前暂存的协商通知。
   */
  configure(iceServers: RTCIceServer[]): void {
    this.iceServers = iceServers;
    this.isReady = true;
    for (const negotiation of this.pendingNegotiations.values()) {
      this.acceptSession(negotiation);
    }
    this.pendingNegotiations.clear();
  }

  /**
   * @returns 无；短断只暂停协商，保留健康媒体和已有重试预算。
   */
  suspend(): void {
    this.isReady = false;
  }

  /**
   * 用服务端成员快照补齐或移除连接，不把快照当作重新建连指令。
   * @param peerIds 当前房间全部成员的 Socket ID。
   * @returns 无；失败预算已耗尽的连接等待用户手动重试。
   */
  reconcile(peerIds: string[]): void {
    const localPeerId = this.options.socket()?.id;
    const nextMemberIds = new Set(peerIds.filter((peerId) => peerId !== localPeerId));
    for (const peerId of this.memberIds) {
      if (!nextMemberIds.has(peerId)) this.remove(peerId);
    }
    this.memberIds = nextMemberIds;

    for (const peerId of nextMemberIds) {
      const session = this.sessionsByPeerId.get(peerId);
      const hasFailed = this.peerStatuses[peerId]?.state === "failed";
      if (hasFailed || this.recoveryTimers.has(peerId)) continue;
      if (!session || session.peer.destroyed) {
        void this.requestNegotiation(peerId, session?.negotiation.connectionId);
      }
    }
  }

  /**
   * 向服务端申请唯一连接代次，同一成员只保留一个在途协商请求。
   * @param peerId 要连接的成员。
   * @param expectedConnectionId 只替换这个旧代次，避免双方同时重建时互相抢占。
   * @returns 请求处理结束；迟到响应不修改已重置的房间。
   */
  private async requestNegotiation(peerId: string, expectedConnectionId?: string): Promise<void> {
    const socket = this.options.socket();
    if (!this.isReady || !socket?.connected) return;
    if (this.negotiatingPeerIds.has(peerId) || !this.memberIds.has(peerId)) return;

    this.negotiatingPeerIds.add(peerId);
    const lifecycleVersion = this.lifecycleVersion;
    const response = await requestAcknowledgement<NegotiationResponse>(
      socket,
      "negotiateMeetingPeer",
      { targetId: peerId, expectedConnectionId },
    );

    // reset 已清理旧请求；不能用旧响应删除新一轮的在途标记。
    if (lifecycleVersion !== this.lifecycleVersion) return;
    this.negotiatingPeerIds.delete(peerId);
    if (!this.memberIds.has(peerId)) return;

    if (response.ok && response.value.ok) {
      this.acceptSession(response.value.session, response.value.iceServers);
    } else {
      this.scheduleRecovery(peerId);
    }
  }

  /**
   * 应用服务端协商结果；重复或旧版本通知不能替换当前连接。
   * @param negotiation 双方共享的连接代次和唯一发起方。
   * @param iceServers 当前成员刷新后的临时 ICE 配置。
   * @returns 无；必要时销毁旧连接并接收暂存信令。
   */
  acceptSession(negotiation: PeerNegotiation, iceServers?: RTCIceServer[]): void {
    if (iceServers) this.iceServers = iceServers;
    const localPeerId = this.options.socket()?.id;
    const peerId = negotiation.peerIds.find((memberId) => memberId !== localPeerId);
    if (!localPeerId || !peerId || !negotiation.peerIds.includes(localPeerId)) return;

    if (!this.isReady) {
      this.bufferNegotiation(peerId, negotiation);
      return;
    }

    this.memberIds.add(peerId);
    const previousSession = this.sessionsByPeerId.get(peerId);
    if (previousSession && previousSession.negotiation.revision >= negotiation.revision) return;

    previousSession?.dispose();
    this.updateRemoteStream(peerId, null);
    this.clearRecoveryTimer(peerId);

    let nextSession: PeerSession;
    try {
      nextSession = this.createSession(peerId, localPeerId, negotiation);
    } catch {
      this.markRecoveryFailed(peerId);
      return;
    }
    this.sessionsByPeerId.set(peerId, nextSession);
    this.deliverPendingSignals(peerId, nextSession);
  }

  /**
   * @param peerId 远端成员。@param negotiation 待应用的协商结果。@returns 无；暂存数量有上限。
   */
  private bufferNegotiation(peerId: string, negotiation: PeerNegotiation): void {
    const previousNegotiation = this.pendingNegotiations.get(peerId);
    const isNewer = !previousNegotiation || previousNegotiation.revision < negotiation.revision;
    if (this.pendingNegotiations.size < MAX_PENDING_SESSIONS && isNewer) {
      this.pendingNegotiations.set(peerId, negotiation);
    }
  }

  /**
   * 把单连接事件接入房间状态，同时隔离已被替换的连接回调。
   * @param peerId 远端成员。
   * @param localPeerId 本次协商使用的本地 Socket 身份。
   * @param negotiation 服务端签发的连接信息。
   * @returns 尚未登记到房间映射中的连接实例。
   */
  private createSession(peerId: string, localPeerId: string, negotiation: PeerNegotiation): PeerSession {
    const lifecycleVersion = this.lifecycleVersion;
    /**
     * @returns 回调是否仍属于当前房间和当前连接代次。
     */
    const ownsCurrentSession = (): boolean => {
      const activeSession = this.sessionsByPeerId.get(peerId);
      return lifecycleVersion === this.lifecycleVersion &&
        activeSession?.negotiation.connectionId === negotiation.connectionId;
    };

    return new PeerSession({
      negotiation,
      localId: localPeerId,
      iceServers: this.iceServers,
      stream: this.localStream,
      send: (signal) => {
        const socket = this.options.socket();
        if (!ownsCurrentSession() || !socket?.connected || socket.id !== localPeerId) return;
        socket.emit("signal", {
          targetId: peerId,
          connectionId: signal.connectionId,
          signal: signal.signal,
        });
      },
      onStream: (stream) => {
        if (ownsCurrentSession()) this.updateRemoteStream(peerId, stream);
      },
      onStatus: (status) => {
        // 构造函数同步发布 connecting，实例此时尚未进入 sessionsByPeerId。
        if (lifecycleVersion !== this.lifecycleVersion) return;
        this.peerStatuses[peerId] = {
          ...status,
          attempts: this.recoveryAttempts.get(peerId) ?? 0,
        };
        this.publishStatuses();
      },
      onFailure: () => {
        if (ownsCurrentSession()) this.scheduleRecovery(peerId);
      },
    });
  }

  /**
   * @param peerId 远端成员。@param session 已登记的新连接。@returns 无；丢弃该成员旧代次的缓存。
   */
  private deliverPendingSignals(peerId: string, session: PeerSession): void {
    const bufferedSignals = this.pendingSignals;
    this.pendingSignals = bufferedSignals.filter((signal) => signal.senderId !== peerId);
    for (const signal of bufferedSignals) {
      if (signal.senderId === peerId && signal.connectionId === session.negotiation.connectionId) {
        session.accept(signal.signal);
      }
    }
  }

  /**
   * @param signal 带连接代次的信令。@returns 无；先于协商通知到达的信令只做有限缓存。
   */
  acceptSignal(signal: MeetingSignal): void {
    const session = this.sessionsByPeerId.get(signal.senderId);
    if (session?.negotiation.connectionId === signal.connectionId) {
      session.accept(signal.signal);
      return;
    }
    if (this.pendingSignals.length < MAX_PENDING_SIGNALS) this.pendingSignals.push(signal);
  }

  /**
   * @param peerId 失败的成员。@returns 无；按指数退避安排下一次协商，不影响其他成员。
   */
  private scheduleRecovery(peerId: string): void {
    if (!this.memberIds.has(peerId) || this.recoveryTimers.has(peerId)) return;
    const attempts = this.recoveryAttempts.get(peerId) ?? 0;
    if (attempts >= MAX_RECOVERY_ATTEMPTS) {
      this.markRecoveryFailed(peerId);
      return;
    }

    this.recoveryAttempts.set(peerId, attempts + 1);
    this.peerStatuses[peerId] = {
      state: "recovering",
      attempts: attempts + 1,
      reason: "等待重新协商媒体连接",
      elapsedMs: this.peerStatuses[peerId]?.elapsedMs ?? 0,
    };
    this.publishStatuses();

    const retryDelayMs = RECOVERY_BASE_DELAY_MS * 2 ** attempts + Math.random() * RECOVERY_JITTER_MS;
    const timer = setTimeout(() => {
      this.recoveryTimers.delete(peerId);
      const connectionId = this.sessionsByPeerId.get(peerId)?.negotiation.connectionId;
      void this.requestNegotiation(peerId, connectionId);
    }, retryDelayMs);
    this.recoveryTimers.set(peerId, timer);
  }

  /**
   * @param peerId 无法继续恢复的成员。@returns 无；将连接标记为等待手动重试。
   */
  private markRecoveryFailed(peerId: string): void {
    this.peerStatuses[peerId] = {
      ...this.peerStatuses[peerId],
      state: "failed",
      attempts: this.recoveryAttempts.get(peerId) ?? 0,
      elapsedMs: this.peerStatuses[peerId]?.elapsedMs ?? 0,
      reason: "自动恢复未成功，请重试或检查 TURN 配置",
    };
    this.publishStatuses();
  }

  /**
   * @param peerId 用户选定的失败连接。@returns 无；只重置此成员的恢复预算。
   */
  retry(peerId: string): void {
    if (!this.memberIds.has(peerId) || this.peerStatuses[peerId]?.state !== "failed") return;
    this.recoveryAttempts.set(peerId, 0);
    void this.requestNegotiation(peerId, this.sessionsByPeerId.get(peerId)?.negotiation.connectionId);
  }

  /**
   * @param stream 本地媒体。@returns 无；轨道变化不重建健康连接，空值仅清除新连接的初始流。
   */
  update(stream: MediaStream | null): void {
    this.localStream = stream;
    if (!stream) return;
    for (const session of this.sessionsByPeerId.values()) session.update(stream);
  }

  /**
   * @param peerId 远端成员。@param stream 最新远端流，null 表示移除。@returns 无；发布不可变快照。
   */
  private updateRemoteStream(peerId: string, stream: MediaStream | null): void {
    if (stream) this.remoteStreams[peerId] = stream;
    else delete this.remoteStreams[peerId];
    this.options.onStreams({ ...this.remoteStreams });
  }

  /**
   * @param peerId 需要停止重试的成员。@returns 无；连接替换和成员移除共用同一清理逻辑。
   */
  private clearRecoveryTimer(peerId: string): void {
    clearTimeout(this.recoveryTimers.get(peerId));
    this.recoveryTimers.delete(peerId);
  }

  /**
   * @param peerId 已离开的成员。@returns 无；释放媒体、重试、缓存和诊断状态。
   */
  remove(peerId: string): void {
    this.memberIds.delete(peerId);
    this.sessionsByPeerId.get(peerId)?.dispose();
    this.sessionsByPeerId.delete(peerId);
    this.clearRecoveryTimer(peerId);
    this.recoveryAttempts.delete(peerId);
    this.pendingNegotiations.delete(peerId);
    this.pendingSignals = this.pendingSignals.filter((signal) => signal.senderId !== peerId);
    delete this.peerStatuses[peerId];
    this.updateRemoteStream(peerId, null);
    this.publishStatuses();
  }

  /**
   * @returns 无；发布副本，防止外部订阅者修改内部诊断状态。
   */
  private publishStatuses(): void {
    this.options.onStatus({ ...this.peerStatuses });
  }

  /**
   * @returns 无；身份改变、离会或宽限到期后释放所有连接，并使旧异步响应失效。
   */
  reset(): void {
    this.lifecycleVersion++;
    this.isReady = false;
    for (const peerId of this.memberIds) this.remove(peerId);
    this.pendingNegotiations.clear();
    this.pendingSignals = [];
    this.negotiatingPeerIds.clear();
    this.localStream = null;
  }
}
