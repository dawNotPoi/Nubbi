import Image from "@/component/UI/Image";
import { Mic, MicOff, Monitor } from "lucide-react";
import { useEffect, useRef, type MutableRefObject, type ReactElement } from "react";
import { useAudioLevel } from "../hooks/use-audio-level";
import type { StageParticipant } from "../types";

type ParticipantMediaProps = {
  participant: StageParticipant;
  localVideoRef?: MutableRefObject<HTMLVideoElement | null>;
};

/**
 * 宫格、主画面和成员列表共用的纯视频/头像展示，始终静音。
 * @param props 成员媒体与可选的本地主画面引用。
 * @returns 成员画面；声音统一由 RemoteAudio 播放，布局变化不会生成新音频出口。
 */
export function ParticipantMedia({ participant, localVideoRef }: ParticipantMediaProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = participant.isVideoEnabled && Boolean(participant.stream?.getVideoTracks()
    .some((track) => track.readyState !== "ended"));
  const level = useAudioLevel(participant.stream?.getAudioTracks()[0], participant.isAudioEnabled && !hasVideo);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.srcObject = participant.stream;
      void video.play().catch(() => undefined);
    }
    if (localVideoRef) localVideoRef.current = participant.isLocal ? video : null;
    return () => {
      if (video) video.srcObject = null;
      if (localVideoRef) localVideoRef.current = null;
    };
  }, [hasVideo, localVideoRef, participant.isLocal, participant.stream]);

  return <div className="relative size-full min-h-28 overflow-hidden rounded-panel bg-bg-selected">
    {hasVideo ? <video ref={videoRef} autoPlay playsInline muted className="size-full object-contain" /> :
      <div className="flex size-full min-h-36 flex-col items-center justify-center gap-2 p-8 pb-14">
        <Image src={participant.avatarSrc || ""} alt={participant.name}
          className={`size-20 rounded-full object-cover ${level > 20 ? "ring-4 ring-accent-border" : ""}`} />
        <span className="text-xs text-text-muted">{participant.isScreenSharing ? "正在连接共享画面…" : "摄像头已关闭"}</span>
      </div>}
    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 rounded-control bg-white px-2 py-1 text-sm text-text-primary">
      {participant.isAudioEnabled ? <Mic size={14} aria-label="麦克风开启" /> : <MicOff size={14} aria-label="麦克风关闭" />}
      <span className="min-w-0 truncate">{participant.name}{participant.isLocal ? "（我）" : ""}</span>
      {participant.isScreenSharing && <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-accent-text"><Monitor size={14} />共享中</span>}
    </div>
  </div>;
}
