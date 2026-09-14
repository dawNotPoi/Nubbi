import Peer from "simple-peer";
import type { MeetingSignal, PeerConnectionStatus, PeerNegotiation } from "./connection-types";
import { rememberPeerTracks, syncPeerTracks } from "./peer-tracks";

type SessionOptions = {
  negotiation: PeerNegotiation; localId: string; stream: MediaStream | null; iceServers: RTCIceServer[];
  send: (signal: MeetingSignal) => void; onStream: (stream: MediaStream | null) => void;
  onStatus: (status: Omit<PeerConnectionStatus, "attempts">) => void; onFailure: () => void;
};

/** 单条媒体连接的生命周期；只发布状态，由上层决定恢复策略。 */
export class PeerSession {
  readonly peer: Peer.Instance;
  readonly negotiation: PeerNegotiation;
  private startedAt = performance.now();
  private disposed = false;
  private failed = false;
  private connected = false;
  private connectedInMs: number | undefined;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private disruption: ReturnType<typeof setTimeout> | undefined;

  /** @param options 双方身份、配置和带所有权检查的回调。 */
  constructor(private readonly options: SessionOptions) {
    this.negotiation = options.negotiation;
    this.peer = new Peer({ initiator: options.localId === this.negotiation.initiatorId, trickle: true,
      stream: options.stream || undefined, config: { iceServers: options.iceServers } });
    rememberPeerTracks(this.peer, options.stream);
    this.status("connecting", "正在建立媒体连接");
    this.timeout = setTimeout(() => this.fail("媒体建连超时"), 20_000);
    this.peer.on("signal", (signal) => {
      if (!this.disposed) options.send({ senderId: options.localId, connectionId: this.negotiation.connectionId, signal });
    });
    this.peer.on("stream", (stream) => { if (!this.disposed) options.onStream(stream); });
    this.peer.on("track", (_track, stream) => { if (!this.disposed && stream) options.onStream(stream); });
    this.peer.on("connect", () => this.markConnected());
    this.peer.on("iceStateChange", (state: string) => {
      if (this.disposed) return;
      if (state === "connected" || state === "completed") {
        clearTimeout(this.disruption); this.disruption = undefined;
        if (this.connected) this.status("connected", "媒体已连接");
      } else if (state === "disconnected" && !this.disruption) {
        this.status("recovering", "媒体网络暂时中断");
        this.disruption = setTimeout(() => this.fail("媒体网络恢复超时"), 5_000);
      } else if (state === "failed") this.fail("ICE 连接失败");
    });
    this.peer.on("error", () => this.fail("媒体连接异常"));
    this.peer.on("close", () => this.fail("媒体连接已关闭"));
  }

  /** @returns 无；媒体和数据通道握手完成后记录耗时。 */
  private markConnected(): void {
    if (this.disposed || this.failed) return;
    this.connected = true;
    this.connectedInMs = performance.now() - this.startedAt;
    clearTimeout(this.timeout);
    this.status("connected", "媒体已连接");
    // 仅提取候选类型；不暴露地址、端口及其他原始统计。
    const inspectable = this.peer as Peer.Instance & { getStats: (callback: (error: Error | null, reports: Record<string, unknown>[]) => void) => void };
    inspectable.getStats((error, reports) => {
      if (error || this.disposed || this.failed || !reports) return;
      const pair = reports.find((report) => report.type === "candidate-pair" && (report.selected === true || (report.nominated === true && report.state === "succeeded")));
      const local = reports.find((report) => report.id === pair?.localCandidateId);
      const remote = reports.find((report) => report.id === pair?.remoteCandidateId);
      if (!pair || !local || !remote) return;
      this.options.onStatus({ state: "connected", reason: "媒体已连接", elapsedMs: this.connectedInMs ?? 0,
        route: local.candidateType === "relay" || remote.candidateType === "relay" ? "relay" : "direct" });
    });
  }

  /** @param state 当前媒体状态。@param reason 固定诊断文案。@returns 无。 */
  private status(state: PeerConnectionStatus["state"], reason: string): void {
    this.options.onStatus({ state, reason, elapsedMs: state === "connected" ? this.connectedInMs ?? 0 : performance.now() - this.startedAt });
  }

  /** @param reason 可公开的失败原因。@returns 无；每代连接最多触发一次恢复。 */
  private fail(reason: string): void {
    if (this.disposed || this.failed) return;
    this.failed = true;
    clearTimeout(this.timeout); clearTimeout(this.disruption);
    this.status("recovering", reason);
    this.options.onStream(null);
    this.peer.destroy();
    this.options.onFailure();
  }

  /** @param signal 已校验代次的信令。@returns 无；解析失败交给恢复流程。 */
  accept(signal: Peer.SignalData): void {
    if (this.disposed || this.failed) return;
    try { this.peer.signal(signal); } catch { this.fail("媒体协商失败"); }
  }

  /** @param stream 身份稳定的本地流。@returns 无；轨道失败仅影响本连接。 */
  update(stream: MediaStream): void {
    if (this.disposed || this.failed) return;
    try { syncPeerTracks(this.peer, stream); } catch { this.fail("媒体轨道同步失败"); }
  }

  /** @returns 无；主动销毁不会触发自动恢复。 */
  dispose(): void {
    this.disposed = true;
    clearTimeout(this.timeout); clearTimeout(this.disruption);
    this.peer.destroy();
  }
}
