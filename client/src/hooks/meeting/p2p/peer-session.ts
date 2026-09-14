import Peer from "simple-peer";
import type { MeetingSignal, PeerConnectionStatus, PeerNegotiation } from "./connection-types";
import { rememberPeerTracks, syncPeerTracks } from "./peer-tracks";

/** 单连接只报告媒体事件和故障，不自行决定重试次数或更新房间成员。 */
type PeerSessionOptions = {
  negotiation: PeerNegotiation;
  localId: string;
  stream: MediaStream | null;
  iceServers: RTCIceServer[];
  send: (signal: MeetingSignal) => void;
  onStream: (stream: MediaStream | null) => void;
  onStatus: (status: Omit<PeerConnectionStatus, "attempts">) => void;
  onFailure: () => void;
};

/** simple-peer 的运行时统计接口；候选原始字段不进入外部状态。 */
type PeerWithStats = Peer.Instance & {
  getStats: (
    callback: (error: Error | null, reports: Record<string, unknown>[]) => void,
  ) => void;
};

const CONNECTION_TIMEOUT_MS = 20_000;
const ICE_DISRUPTION_GRACE_MS = 5_000;

/**
 * 从已选中的候选对判断直连或中继；信息不足时不猜测。
 * @param reports simple-peer 归一化后的统计记录。
 * @returns 仅返回路径类型，不返回候选地址、端口或原始统计。
 */
function readConnectionRoute(reports: Record<string, unknown>[]): PeerConnectionStatus["route"] {
  const selectedPair = reports.find((report) =>
    report.type === "candidate-pair" &&
    (report.selected === true || (report.nominated === true && report.state === "succeeded")),
  );
  if (!selectedPair) return undefined;

  const localCandidate = reports.find((report) => report.id === selectedPair.localCandidateId);
  const remoteCandidate = reports.find((report) => report.id === selectedPair.remoteCandidateId);
  if (!localCandidate || !remoteCandidate) return undefined;

  const usesRelay = localCandidate.candidateType === "relay" || remoteCandidate.candidateType === "relay";
  return usesRelay ? "relay" : "direct";
}

/**
 * 管理单条媒体连接的建立、短断检测和资源释放。
 * 故障最多上报一次；是否重建以及重建哪个代次由 PeerNetwork 决定。
 */
export class PeerSession {
  /** 底层连接，仅供上层读取存活状态和同步媒体轨道。 */
  readonly peer: Peer.Instance;
  /** 创建后不再变更；新代次必须创建新实例。 */
  readonly negotiation: PeerNegotiation;
  private readonly startedAt = performance.now();
  private isDisposed = false;
  private hasFailed = false;
  private isConnected = false;
  private connectionDurationMs: number | undefined;
  private connectionTimeout: ReturnType<typeof setTimeout> | undefined;
  private disruptionTimeout: ReturnType<typeof setTimeout> | undefined;

  /**
   * @param options 双方身份、ICE 配置和由上层检查所有权的回调。
   */
  constructor(private readonly options: PeerSessionOptions) {
    this.negotiation = options.negotiation;
    this.peer = new Peer({
      initiator: options.localId === this.negotiation.initiatorId,
      trickle: true,
      stream: options.stream || undefined,
      config: { iceServers: options.iceServers },
    });
    rememberPeerTracks(this.peer, options.stream);
    this.publishStatus("connecting", "正在建立媒体连接");
    this.connectionTimeout = setTimeout(() => this.fail("媒体建连超时"), CONNECTION_TIMEOUT_MS);
    this.registerPeerEvents();
  }

  /**
   * @returns 无；集中绑定底层事件，保持构造流程只描述初始化步骤。
   */
  private registerPeerEvents(): void {
    this.peer.on("signal", (signal) => {
      if (this.isDisposed) return;
      this.options.send({
        senderId: this.options.localId,
        connectionId: this.negotiation.connectionId,
        signal,
      });
    });
    this.peer.on("stream", (stream) => {
      if (!this.isDisposed) this.options.onStream(stream);
    });
    this.peer.on("track", (_track, stream) => {
      if (!this.isDisposed && stream) this.options.onStream(stream);
    });
    this.peer.on("connect", () => this.markConnected());
    this.peer.on("iceStateChange", (state: string) => this.handleIceStateChange(state));
    this.peer.on("error", () => this.fail("媒体连接异常"));
    this.peer.on("close", () => this.fail("媒体连接已关闭"));
  }

  /**
   * ICE 暂时断开时保留连接，给底层网络一个短暂恢复窗口。
   * @param state simple-peer 发布的 ICE 状态。
   * @returns 无；超出宽限或明确失败才交给房间层恢复。
   */
  private handleIceStateChange(state: string): void {
    if (this.isDisposed) return;
    if (state === "connected" || state === "completed") {
      clearTimeout(this.disruptionTimeout);
      this.disruptionTimeout = undefined;
      if (this.isConnected) this.publishStatus("connected", "媒体已连接");
      return;
    }

    if (state === "disconnected" && !this.disruptionTimeout) {
      this.publishStatus("recovering", "媒体网络暂时中断");
      this.disruptionTimeout = setTimeout(
        () => this.fail("媒体网络恢复超时"),
        ICE_DISRUPTION_GRACE_MS,
      );
    } else if (state === "failed") {
      this.fail("ICE 连接失败");
    }
  }

  /**
   * @returns 无；媒体和数据通道握手完成后固定建连耗时，再异步读取脱敏诊断。
   */
  private markConnected(): void {
    if (this.isDisposed || this.hasFailed) return;
    this.isConnected = true;
    this.connectionDurationMs = performance.now() - this.startedAt;
    clearTimeout(this.connectionTimeout);
    this.publishStatus("connected", "媒体已连接");
    this.publishConnectionRoute();
  }

  /**
   * @returns 无；统计回调晚于销毁或失败时直接丢弃，避免覆盖新连接状态。
   */
  private publishConnectionRoute(): void {
    const peerWithStats = this.peer as PeerWithStats;
    peerWithStats.getStats((error, reports) => {
      if (error || this.isDisposed || this.hasFailed || !reports) return;
      const route = readConnectionRoute(reports);
      if (!route) return;
      this.options.onStatus({
        state: "connected",
        reason: "媒体已连接",
        elapsedMs: this.connectionDurationMs ?? 0,
        route,
      });
    });
  }

  /**
   * @param state 当前媒体状态。@param reason 不含底层敏感数据的固定文案。@returns 无。
   */
  private publishStatus(state: PeerConnectionStatus["state"], reason: string): void {
    const elapsedMs = state === "connected"
      ? this.connectionDurationMs ?? 0
      : performance.now() - this.startedAt;
    this.options.onStatus({ state, reason, elapsedMs });
  }

  /**
   * @returns 无；主动销毁和故障退出共用同一计时器清理入口。
   */
  private clearTimeouts(): void {
    clearTimeout(this.connectionTimeout);
    clearTimeout(this.disruptionTimeout);
  }

  /**
   * 将当前代次标记为失败，释放底层连接，然后通知上层安排恢复。
   * @param reason 可以公开展示的失败原因。
   * @returns 无；先标记失败，阻止 destroy 引发的 close 事件重复触发恢复。
   */
  private fail(reason: string): void {
    if (this.isDisposed || this.hasFailed) return;
    this.hasFailed = true;
    this.clearTimeouts();
    this.publishStatus("recovering", reason);
    this.options.onStream(null);
    this.peer.destroy();
    this.options.onFailure();
  }

  /**
   * @param signal 已由上层检查连接代次的信令。@returns 无；解析异常转为本连接故障。
   */
  accept(signal: Peer.SignalData): void {
    if (this.isDisposed || this.hasFailed) return;
    try {
      this.peer.signal(signal);
    } catch {
      this.fail("媒体协商失败");
    }
  }

  /**
   * @param stream 身份稳定的本地流。@returns 无；同步音视频轨道，失败仅影响本连接。
   */
  update(stream: MediaStream): void {
    if (this.isDisposed || this.hasFailed) return;
    try {
      syncPeerTracks(this.peer, stream);
    } catch {
      this.fail("媒体轨道同步失败");
    }
  }

  /**
   * @returns 无；主动销毁不触发自动恢复，也不停止由外部持有的本地设备轨道。
   */
  dispose(): void {
    this.isDisposed = true;
    this.clearTimeouts();
    this.peer.destroy();
  }
}
