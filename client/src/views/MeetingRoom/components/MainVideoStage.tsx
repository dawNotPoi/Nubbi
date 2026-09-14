import Image from "@/component/UI/Image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";
import type { StageParticipant } from "../types";

type MainVideoStageProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  participants: StageParticipant[];
};

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

function ParticipantStageCard({
  participant,
  videoRef,
  fullScreen,
}: {
  participant: StageParticipant;
  videoRef?: RefObject<HTMLVideoElement | null>;
  fullScreen?: boolean;
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
    },
    [participant.stream, videoRef],
  );
  return (
    <div
      className={`flex min-h-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#f5f5f5] text-center ${fullScreen ? "h-full w-full p-0" : "min-h-[240px] flex-1 p-4"}`}
    >
      {participant.isVideoEnabled ? (
        <video
          autoPlay
          playsInline
          muted={participant.isLocal}
          className={`h-full w-full ${fullScreen ? "object-contain bg-black" : "rounded-2xl object-cover"}`}
          ref={bindVideoRef}
        />
      ) : (
        <>
          <Image
            className={avatarClassName}
            src={participant.avatarSrc || ""}
            alt={participant.name}
          />
          <div className="text-base text-black">{participant.name}</div>
        </>
      )}
    </div>
  );
}

export default function MainVideoStage({
  videoRef,
  participants,
}: MainVideoStageProps) {
  const isSingleParticipant = participants.length <= 1;

  return (
    <div className="flex size-full flex-1 flex-col overflow-hidden bg-[#fbfbfa]">
      <section className="w-full flex-1 overflow-hidden bg-[#fbfbfa] p-4">
        <div
          className={`mx-auto flex h-full w-full items-center justify-center gap-4 ${isSingleParticipant ? "" : "flex-wrap"}`}
        >
          {participants.map((participant) => (
            <ParticipantStageCard
              key={participant.id}
              participant={participant}
              videoRef={participant.isLocal ? videoRef : undefined}
              fullScreen={isSingleParticipant}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
