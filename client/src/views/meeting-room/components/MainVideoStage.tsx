import Image from "@/component/UI/Image";
import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, type MutableRefObject, type ReactElement } from "react";
import { useAudioLevel } from "../hooks/use-audio-level";
import type { StageParticipant } from "../types";

type Props = { videoRef: MutableRefObject<HTMLVideoElement | null>; participants: StageParticipant[]; activeParticipantId?: string };

/** @param props 成员信息。@returns 不创建音频播放出口的头像与发言标识。 */
function ParticipantAvatar({ participant }: { participant: StageParticipant }): ReactElement {
  const level = useAudioLevel(participant.stream?.getAudioTracks()[0], participant.isAudioEnabled);
  return <div className="flex flex-col items-center gap-3 p-4">
    <Image src={participant.avatarSrc || ""} alt={participant.name} className={`size-24 rounded-full object-cover ${level > 20 ? "ring-4 ring-accent-border" : ""}`} />
    <span className="flex items-center gap-2 text-sm text-text-primary">{participant.isAudioEnabled ? <Mic size={16} /> : <MicOff size={16} />}{participant.name}</span>
  </div>;
}

/** @param props 主画面选择和成员信息。@returns 纯视频展示；所有远端声音由 RemoteAudio 负责。 */
export default function MainVideoStage({ videoRef, participants, activeParticipantId }: Props): ReactElement {
  const videoParticipants = participants.filter((participant) => participant.isVideoEnabled && participant.stream?.getVideoTracks().length);
  const active = videoParticipants.find((participant) => participant.id === activeParticipantId) || videoParticipants[0];
  const stageRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = stageRef.current;
    if (!video) return;
    video.srcObject = active?.stream ?? null;
    videoRef.current = active?.isLocal ? video : null;
    void video.play().catch(() => undefined);
    return () => { video.srcObject = null; videoRef.current = null; };
  }, [active?.id, active?.isLocal, active?.stream, videoRef]);
  return <section className="min-h-0 min-w-0 flex-1 overflow-hidden bg-bg-panel p-2 sm:p-4">
    {active ? <div className="relative size-full overflow-hidden rounded-xl bg-bg-selected">
      <video ref={stageRef} autoPlay playsInline muted className="size-full object-contain" />
      <div className="absolute bottom-3 left-3 rounded-lg bg-white px-3 py-1 text-sm text-text-primary">{active.name}{active.isLocal ? "（我）" : ""}</div>
    </div> : <div className="flex size-full flex-wrap content-center justify-center overflow-y-auto">
      {participants.map((participant) => <ParticipantAvatar key={participant.id} participant={participant} />)}
    </div>}
  </section>;
}
