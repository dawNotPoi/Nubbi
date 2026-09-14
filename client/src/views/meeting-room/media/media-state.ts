import type { DeviceStatus, MediaToggleKind } from "../types";

/** 本地设备状态；摄像头与共享画面的开关分开保存。 */
export type MediaSnapshot = {
  revision: number;
  audio: DeviceStatus;
  video: DeviceStatus;
  sharing: boolean;
  busy: Record<MediaToggleKind | "screen", boolean>;
  errors: Record<MediaToggleKind | "screen", string>;
};

/** 媒体所有权容器，不建立网络连接，也不主动获取权限。 */
export class MediaState {
  readonly stream = new MediaStream();
  camera: MediaStreamTrack | null = null;
  screen: MediaStreamTrack | null = null;
  active = false;
  generation = 0;
  private listeners = new Set<() => void>();
  private snapshot: MediaSnapshot = {
    revision: 0, audio: { open: false, deviceId: "" }, video: { open: false, deviceId: "" },
    sharing: false, busy: { audio: false, video: false, screen: false },
    errors: { audio: "", video: "", screen: "" },
  };

  /** @returns 当前不可变快照，供 React 订阅。 */
  read = (): MediaSnapshot => this.snapshot;

  /** @param listener 变化通知。@returns 取消订阅函数。 */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** @param patch 新状态。@returns 无；通知轨道同步和视图更新。 */
  update(patch: Partial<MediaSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch, revision: this.snapshot.revision + 1 };
    this.listeners.forEach((listener) => listener());
  }

  /** @param kind 设备类型。@param next 发送的新轨道或空值。@returns 无。 */
  replace(kind: MediaToggleKind, next: MediaStreamTrack | null): void {
    this.stream.getTracks().filter((track) => track.kind === kind).forEach((track) => {
      this.stream.removeTrack(track);
    });
    if (next) this.stream.addTrack(next);
  }

  /** @returns 无；失效所有异步权限结果并释放所有已拥有的设备。 */
  release = (): void => {
    this.active = false;
    this.generation++;
    const tracks = new Set([...this.stream.getTracks(), this.camera, this.screen]);
    tracks.forEach((track) => {
      if (!track) return;
      track.onended = null;
      track.stop();
      this.stream.removeTrack(track);
    });
    this.camera = null;
    this.screen = null;
    this.update({ audio: { open: false, deviceId: "" }, video: { open: false, deviceId: "" },
      sharing: false, busy: { audio: false, video: false, screen: false } });
  };
}

/** @param error 浏览器错误。@returns 用户可以据此恢复操作的说明。 */
export function describeMediaError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError") return "权限未获允许，请在浏览器地址栏允许设备访问后重试，也可以仅收听入会。";
  if (name === "NotFoundError") return "未找到该设备，请连接设备后重试；不影响使用另一种设备。";
  if (name === "NotReadableError") return "设备可能被其他应用占用，请关闭占用程序后重试。";
  if (name === "OverconstrainedError") return "所选设备已不可用，请选择其他设备。";
  return "无法访问设备，请确认使用 HTTPS 或 localhost，并检查浏览器是否支持。";
}
