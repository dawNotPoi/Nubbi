import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DeviceCapture } from "../media/device-capture";
import { MediaState, type MediaSnapshot } from "../media/media-state";
import { ScreenCapture } from "../media/screen-capture";
import type { MediaDevices, MediaToggleKind } from "../types";
import { authLifecycleRegistry } from "@/features/auth/model/auth-lifecycle";

/** 本地媒体 Hook 的公共接口。 */
export type LocalMedia = MediaSnapshot & {
  devices: MediaDevices; stream: MediaStream;
  toggle: (kind: MediaToggleKind, enabled: boolean) => Promise<void>;
  select: (kind: MediaToggleKind, deviceId: string) => Promise<void>;
  startScreenShare: () => Promise<void>; stopScreenShare: () => void; release: () => void;
};

/** @returns 由准备页和会议室共享的媒体；卸载时失效异步请求并释放设备。 */
export function useLocalMedia(): LocalMedia {
  const state = useMemo(() => new MediaState(), []);
  const capture = useMemo(() => new DeviceCapture(state), [state]);
  const screen = useMemo(() => new ScreenCapture(state), [state]);
  const snapshot = useSyncExternalStore(state.subscribe, state.read);
  const [devices, setDevices] = useState<MediaDevices>({ audio: [], video: [] });

  useEffect(() => {
    state.active = true;
    const unregisterLifecycle = authLifecycleRegistry.register({
      id: `meeting-local-media:${crypto.randomUUID()}`,
      disconnect: state.release,
    });
    window.addEventListener("pagehide", state.release);
    return () => {
      unregisterLifecycle();
      window.removeEventListener("pagehide", state.release);
      state.release();
    };
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async (): Promise<void> => {
      try {
        const list = await navigator.mediaDevices?.enumerateDevices();
        if (!cancelled && list) setDevices({ audio: list.filter((device) => device.kind === "audioinput"), video: list.filter((device) => device.kind === "videoinput") });
      } catch { /* 枚举失败不妨碍用户主动请求权限。 */ }
    };
    void refresh();
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    return () => { cancelled = true; navigator.mediaDevices?.removeEventListener("devicechange", refresh); };
  }, [snapshot.audio.deviceId, snapshot.video.deviceId]);

  return { ...snapshot, devices, stream: state.stream, toggle: capture.toggle, select: capture.select,
    startScreenShare: screen.start, stopScreenShare: screen.stop, release: state.release };
}
