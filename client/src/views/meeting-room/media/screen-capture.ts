import { describeMediaError, MediaState } from "./media-state";

/** 屏幕共享只替换发送画面，不改变摄像头原有开关。 */
export class ScreenCapture {
  private request = 0;
  /** @param state 本地媒体容器。 */
  constructor(private readonly state: MediaState) {}

  /** @returns 无；取消待处理共享或恢复摄像头。 */
  stop = (): void => {
    this.request++;
    const screen = this.state.screen;
    this.state.screen = null;
    this.state.replace("video", this.state.camera);
    if (screen) { screen.onended = null; screen.stop(); }
    this.state.update({ sharing: false, busy: { ...this.state.read().busy, screen: false } });
  };

  /** @returns 无；用户取消浏览器选择器不显示权限错误。 */
  start = async (): Promise<void> => {
    if (!this.state.active || this.state.read().busy.screen || this.state.screen) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.state.update({ errors: { ...this.state.read().errors, screen: "当前浏览器不支持屏幕共享，请使用支持共享的桌面浏览器。" } });
      return;
    }
    const request = ++this.request;
    const generation = this.state.generation;
    const isCurrent = (): boolean => this.state.active && generation === this.state.generation && request === this.request;
    this.state.update({ busy: { ...this.state.read().busy, screen: true }, errors: { ...this.state.read().errors, screen: "" } });
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screen = stream.getVideoTracks()[0];
      if (!isCurrent() || !screen) { stream.getTracks().forEach((track) => track.stop()); return; }
      stream.getTracks().filter((track) => track !== screen).forEach((track) => track.stop());
      this.state.screen = screen;
      this.state.replace("video", screen);
      screen.onended = this.stop;
      this.state.update({ sharing: true });
    } catch (error) {
      if (isCurrent() && !(error instanceof Error && error.name === "NotAllowedError")) {
        this.state.update({ errors: { ...this.state.read().errors, screen: describeMediaError(error) } });
      }
    } finally {
      if (isCurrent()) this.state.update({ busy: { ...this.state.read().busy, screen: false } });
    }
  };
}
