import { Alert, Button, Progress, Select } from "antd";
import { useEffect, useRef, type ReactElement } from "react";
import { useAudioLevel } from "../hooks/use-audio-level";
import type { LocalMedia } from "../hooks/use-local-media";

type MeetingLobbyProps = { title: string; media: LocalMedia; onJoin: () => void; onCancel: () => void };

/** @param props 准备页媒体、标题及导航操作。@returns 不向其他成员发布媒体的准备界面。 */
export function MeetingLobby({ title, media, onJoin, onCancel }: MeetingLobbyProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const level = useAudioLevel(media.stream.getAudioTracks()[0], media.audio.open);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = media.stream;
    void video.play().catch(() => undefined);
    return () => { video.srcObject = null; };
  }, [media.stream, media.revision]);
  const pending = media.busy.audio || media.busy.video;
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg-panel p-4">
      <section className="w-full max-w-3xl space-y-5 rounded-xl border border-border-row bg-white p-5 sm:p-8">
        <header><h1 className="text-xl font-semibold text-text-primary">准备加入 · {title || "会议"}</h1>
          <p className="mt-2 text-sm text-text-muted">设备默认关闭。预览仅自己可见，点击加入后才连接会议。</p></header>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-bg-selected">
          <video ref={videoRef} autoPlay muted playsInline className={`size-full object-contain ${media.video.open ? "" : "invisible"}`} />
          {!media.video.open && <div className="absolute inset-0 grid place-items-center text-text-muted">摄像头已关闭</div>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["audio", "video"] as const).map((kind) => (
            <div key={kind} className="min-w-0 space-y-2">
              <Button block loading={media.busy[kind]} onClick={() => void media.toggle(kind, !media[kind].open)}>
                {media[kind].open ? "关闭" : "开启"}{kind === "audio" ? "麦克风" : "摄像头"}
              </Button>
              <Select className="w-full" aria-label={kind === "audio" ? "麦克风设备" : "摄像头设备"}
                placeholder="开启设备后可选择" value={media[kind].deviceId || undefined} disabled={media.busy[kind]}
                options={media.devices[kind].filter((device) => device.deviceId).map((device, index) => ({ value: device.deviceId, label: device.label || `设备 ${index + 1}` }))}
                onChange={(id: string) => void media.select(kind, id)} />
              {kind === "audio" && <div><span className="text-xs text-text-muted">麦克风音量</span><Progress percent={level} showInfo={false} /></div>}
              {media.errors[kind] && <Alert type="warning" showIcon message={media.errors[kind]} />}
            </div>
          ))}
        </div>
        {pending && <p className="text-sm text-text-muted">请处理浏览器权限提示；选择仅收听可忽略尚未完成的设备申请。</p>}
        <footer className="flex flex-wrap justify-end gap-2">
          <Button onClick={onCancel}>返回会议列表</Button>
          <Button onClick={() => { void media.toggle("audio", false); void media.toggle("video", false); onJoin(); }}>仅收听加入</Button>
          <Button type="primary" disabled={pending} onClick={onJoin}>加入会议</Button>
        </footer>
      </section>
    </main>
  );
}
