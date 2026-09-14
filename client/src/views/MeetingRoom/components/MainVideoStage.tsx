import Image from "@/component/UI/Image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MutableRefObject,
} from "react";
import { BiMicrophoneOff } from "react-icons/bi";
import { TbMicrophoneFilled } from "react-icons/tb";
import type { StageParticipant } from "../types";

type MainVideoStageProps = {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  participants: StageParticipant[];
  activeParticipantId?: string;
};

const hasVideoTrack = (stream: MediaStream | null) =>
  Boolean(stream?.getVideoTracks().length);

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function useSpeaking(stream: MediaStream | null, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!stream || !enabled) {
      setSpeaking(false);
      return;
    }
    const audioTracks = stream
      .getAudioTracks()
      .filter((track) => track.enabled);
    if (audioTracks.length === 0) {
      setSpeaking(false);
      return;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      setSpeaking(false);
      return;
    }

    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.fftSize);
    let animationFrameId = 0;
    let disposed = false;

    const detect = () => {
      if (disposed) return;

      analyser.getByteTimeDomainData(dataArray);
      let total = 0;

      for (let index = 0; index < dataArray.length; index += 1) {
        const normalized = (dataArray[index] - 128) / 128;
        total += normalized * normalized;
      }

      const volume = Math.sqrt(total / dataArray.length);
      setSpeaking(volume > 0.06);
      animationFrameId = window.requestAnimationFrame(detect);
    };

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => undefined);
    }

    detect();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrameId);
      source.disconnect();
      analyser.disconnect();
      audioContext.close().catch(() => undefined);
    };
  }, [enabled, stream]);

  return speaking;
}

function ParticipantLabel({
  name,
  speaking,
  audioEnabled,
}: {
  name: string;
  speaking: boolean;
  audioEnabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full  px-3 py-1.5  backdrop-blur-sm">
      {audioEnabled ? (
        <TbMicrophoneFilled
          className={speaking ? "text-sky-500" : "text-black"}
        />
      ) : (
        <BiMicrophoneOff />
      )}
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}

function ParticipantStageCard({
  participant,
  videoRef,
}: {
  participant: StageParticipant;
  videoRef?: MutableRefObject<HTMLVideoElement | null>;
}) {
  const isSpeaking = useSpeaking(
    participant.stream,
    participant.isAudioEnabled,
  );
  const avatarClassName = useMemo(() => {
    const base =
      "size-24 rounded-full object-cover transition-shadow duration-200";
    return isSpeaking
      ? `${base} shadow-[0_0_30px_rgba(59,130,246,0.75)]`
      : `${base} shadow-sm`;
  }, [isSpeaking]);

  const bindVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      if (!element) return;
      if (videoRef) {
        videoRef.current = element;
      }
      if (element.srcObject !== participant.stream) {
        element.srcObject = participant.stream;
      }
      element.play().catch(() => undefined);
    },
    [participant.stream, videoRef],
  );
  const canRenderVideo =
    participant.isVideoEnabled && hasVideoTrack(participant.stream);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[28px] bg-[#f5f5f5] p-0 text-center">
      {canRenderVideo ? (
        <video
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="h-full w-full bg-black object-contain"
          ref={bindVideoRef}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Image
            className={avatarClassName}
            src={participant.avatarSrc || ""}
            alt={participant.name}
          />
          <ParticipantLabel
            name={participant.name}
            speaking={isSpeaking}
            audioEnabled={participant.isAudioEnabled}
          />
        </div>
      )}
      {canRenderVideo ? (
        <div className="absolute bottom-4 left-4">
          <ParticipantLabel
            name={participant.name}
            speaking={isSpeaking}
            audioEnabled={participant.isAudioEnabled}
          />
        </div>
      ) : null}
    </div>
  );
}

function AvatarItem({ participant }: { participant: StageParticipant }) {
  const isSpeaking = useSpeaking(
    participant.stream,
    participant.isAudioEnabled,
  );

  return (
    <div className="flex p-2 flex-col items-center justify-center gap-3">
      <Image
        className={`size-24 rounded-full object-cover shadow-sm ${
          isSpeaking ? "shadow-[0_0_30px_rgba(16,185,129,0.35)]" : ""
        }`}
        src={participant.avatarSrc || ""}
        alt={participant.name}
      />
      <ParticipantLabel
        name={participant.name}
        speaking={isSpeaking}
        audioEnabled={participant.isAudioEnabled}
      />
    </div>
  );
}

function AvatarGallery({ participants }: { participants: StageParticipant[] }) {
  return (
    <div className="mx-auto flex h-full w-full flex-wrap content-center justify-center gap-4">
      {participants.map((participant) => (
        <AvatarItem key={participant.id} participant={participant} />
      ))}
    </div>
  );
}

export default function MainVideoStage({
  videoRef,
  participants,
  activeParticipantId,
}: MainVideoStageProps) {
  const videoParticipants = participants.filter(
    (participant) => participant.isVideoEnabled && hasVideoTrack(participant.stream),
  );
  const activeParticipant =
    videoParticipants.find(
      (participant) => participant.id === activeParticipantId,
    ) || videoParticipants[0];
  const hasActiveVideo = !!activeParticipant;

  return (
    <div className="flex size-full flex-1 flex-col overflow-hidden bg-[#fbfbfa]">
      <section className="w-full flex-1 overflow-hidden bg-[#fbfbfa] p-4">
        {hasActiveVideo && activeParticipant ? (
          <ParticipantStageCard
            participant={activeParticipant}
            videoRef={activeParticipant.isLocal ? videoRef : undefined}
          />
        ) : (
          <AvatarGallery participants={participants} />
        )}
      </section>
    </div>
  );
}
