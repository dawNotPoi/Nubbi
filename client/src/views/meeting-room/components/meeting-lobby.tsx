import { Alert, Button, Progress, Select } from "antd";
import { useEffect, useRef, type ReactElement } from "react";
import { useAudioLevel } from "../hooks/use-audio-level";
import type { LocalMedia } from "../hooks/use-local-media";

type MeetingLobbyProps = {
  title: string;
  media: LocalMedia;
  onJoin: () => void;
  onCancel: () => void;
};

/**
 * 渲染入会准备页，预览本地媒体并配置设备。
 * @param props 会议标题、本地媒体状态以及加入/返回操作。
 * @returns 不向其他成员发布媒体的准备界面。
 */
export function MeetingLobby({ title, media, onJoin, onCancel }: MeetingLobbyProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const level = useAudioLevel(media.stream.getAudioTracks()[0], media.audio.open);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = media.stream;
    void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
    };
  }, [media.stream, media.revision]);

  const pending = media.busy.audio || media.busy.video;

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-canvas px-3 py-[max(16px,env(safe-area-inset-top))] sm:p-6">
      <section className="w-full max-w-3xl space-y-5 rounded-[12px] border border-border-row bg-surface p-4 shadow-[0_8px_30px_rgba(55,53,47,0.06)] sm:p-7">
        <header>
          <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.015em] text-text-primary sm:text-[22px]">
            准备加入 · {title || "会议"}
          </h1>
          <p className="mt-1.5 text-[13px] leading-5 text-text-muted sm:text-sm">
            设备默认关闭。预览仅自己可见，点击加入后才连接会议。
          </p>
        </header>

        <div className="relative aspect-video overflow-hidden rounded-[10px] bg-bg-selected">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`size-full object-contain ${media.video.open ? "" : "invisible"}`}
          />
          {!media.video.open ? (
            <div className="absolute inset-0 grid place-items-center text-[14px] text-text-muted">
              摄像头已关闭
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(["audio", "video"] as const).map((kind) => (
            <div key={kind} className="min-w-0 space-y-2">
              <Button
                block
                className="min-h-11 rounded-[8px] sm:min-h-9"
                loading={media.busy[kind]}
                onClick={() => void media.toggle(kind, !media[kind].open)}
              >
                {media[kind].open ? "关闭" : "开启"}{kind === "audio" ? "麦克风" : "摄像头"}
              </Button>
              <Select
                className="w-full"
                aria-label={kind === "audio" ? "麦克风设备" : "摄像头设备"}
                placeholder="开启设备后可选择"
                value={media[kind].deviceId || undefined}
                disabled={media.busy[kind]}
                options={media.devices[kind]
                  .filter((device) => device.deviceId)
                  .map((device, index) => ({
                    value: device.deviceId,
                    label: device.label || `设备 ${index + 1}`,
                  }))}
                onChange={(id: string) => void media.select(kind, id)}
              />
              {kind === "audio" ? (
                <div>
                  <span className="text-xs text-text-muted">麦克风音量</span>
                  <Progress percent={level} showInfo={false} />
                </div>
              ) : null}
              {media.errors[kind] ? (
                <Alert type="warning" showIcon message={media.errors[kind]} />
              ) : null}
            </div>
          ))}
        </div>

        {pending ? (
          <p className="text-[13px] leading-5 text-text-muted">
            请处理浏览器权限提示；选择仅收听可忽略尚未完成的设备申请。
          </p>
        ) : null}

        <footer className="grid grid-cols-1 gap-2 pt-1 sm:flex sm:flex-wrap sm:justify-end">
          <Button className="min-h-11 rounded-[8px] sm:min-h-9" onClick={onCancel}>
            返回会议列表
          </Button>
          <Button
            className="min-h-11 rounded-[8px] sm:min-h-9"
            onClick={() => {
              void media.toggle("audio", false);
              void media.toggle("video", false);
              onJoin();
            }}
          >
            仅收听加入
          </Button>
          <Button
            className="min-h-11 rounded-[8px] sm:min-h-9"
            type="primary"
            disabled={pending}
            onClick={onJoin}
          >
            加入会议
          </Button>
        </footer>
      </section>
    </main>
  );
}
