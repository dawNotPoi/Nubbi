import type { MediaToggleKind } from "../types";
import { describeMediaError, MediaState } from "./media-state";

/** 分别请求音频和摄像头，按设备请求身份忽略过期结果。 */
export class DeviceCapture {
  private requests = { audio: 0, video: 0 };
  /** @param state 本地媒体所有权容器。 */
  constructor(private readonly state: MediaState) {}

  /** @param kind 设备类型。@returns 当前设备轨道。 */
  private track(kind: MediaToggleKind): MediaStreamTrack | null {
    return kind === "video" ? this.state.camera : this.state.stream.getAudioTracks()[0] ?? null;
  }

  /** @param kind 设备类型。@param enabled 是否开启。@returns 无；必要时申请单个设备权限。 */
  toggle = async (kind: MediaToggleKind, enabled: boolean): Promise<void> => {
    if (!this.state.active) return;
    const track = this.track(kind);
    if (enabled && (!track || track.readyState === "ended")) {
      await this.acquire(kind, this.state.read()[kind].deviceId, true);
      return;
    }
    this.requests[kind]++;
    if (track) track.enabled = enabled;
    this.state.update({ [kind]: { ...this.state.read()[kind], open: enabled },
      busy: { ...this.state.read().busy, [kind]: false }, errors: { ...this.state.read().errors, [kind]: "" } });
  };

  /** @param kind 设备类型。@param deviceId 设备标识。@returns 无；保留静音或关闭状态。 */
  select = async (kind: MediaToggleKind, deviceId: string): Promise<void> => {
    await this.acquire(kind, deviceId, this.state.read()[kind].open);
  };

  /** @param kind 设备类型。@param deviceId 可选设备。@param enabled 目标开关。@returns 无。 */
  private async acquire(kind: MediaToggleKind, deviceId: string, enabled: boolean): Promise<void> {
    if (!this.state.active) return;
    const request = ++this.requests[kind];
    const generation = this.state.generation;
    const isCurrent = (): boolean => this.state.active && generation === this.state.generation && request === this.requests[kind];
    this.state.update({ busy: { ...this.state.read().busy, [kind]: true }, errors: { ...this.state.read().errors, [kind]: "" } });
    try {
      const constraint = deviceId ? { deviceId: { exact: deviceId } } : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: kind === "audio" ? constraint : false, video: kind === "video" ? constraint : false });
      const next = stream.getTracks().find((track) => track.kind === kind);
      if (!isCurrent() || !next) { stream.getTracks().forEach((track) => track.stop()); return; }
      stream.getTracks().filter((track) => track !== next).forEach((track) => track.stop());
      const previous = this.track(kind);
      next.enabled = enabled;
      if (kind === "video") this.state.camera = next;
      if (kind === "audio" || !this.state.screen) this.state.replace(kind, next);
      if (previous) { previous.onended = null; previous.stop(); }
      next.onended = () => {
        if (this.track(kind) !== next) return;
        if (kind === "video") this.state.camera = null;
        if (kind === "audio" || !this.state.screen) this.state.replace(kind, null);
        this.state.update({ [kind]: { ...this.state.read()[kind], open: false },
          errors: { ...this.state.read().errors, [kind]: "设备已断开或权限被撤销，请重新选择设备或开启后重试。" } });
      };
      this.state.update({ [kind]: { open: enabled, deviceId: next.getSettings().deviceId || deviceId } });
    } catch (error) {
      if (isCurrent()) this.state.update({ errors: { ...this.state.read().errors, [kind]: describeMediaError(error) } });
    } finally {
      if (isCurrent()) this.state.update({ busy: { ...this.state.read().busy, [kind]: false } });
    }
  }
}
