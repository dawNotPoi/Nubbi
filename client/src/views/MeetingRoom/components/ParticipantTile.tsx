import Image from "@/component/UI/Image";
import { useCallback, useEffect, useRef, useState } from "react";
import { BiMicrophoneOff } from "react-icons/bi";
import { TbMicrophoneFilled } from "react-icons/tb";

type ParticipantTileProps = {
  id: string;
  name: string;
  stream: MediaStream | null;
  avatarSrc?: string;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isActive?: boolean;
  onSelect?: (participantId: string) => void;
};

const hasVideoTrack = (stream: MediaStream | null) => {
  return Boolean(stream?.getVideoTracks().length);
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

export default function ParticipantTile({
  id,
  name,
  stream,
  avatarSrc,
  isVideoEnabled = false,
  isAudioEnabled = false,
  isActive = false,
  onSelect,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canRenderVideo = isVideoEnabled && hasVideoTrack(stream);
  const isSelectable = canRenderVideo && !!onSelect;
  const isSpeaking = useSpeaking(stream, isAudioEnabled);

  const bindVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      videoRef.current = element;
      if (!element) return;
      if (element.srcObject !== stream) {
        element.srcObject = stream;
      }
      element.play().catch(() => undefined);
    },
    [stream],
  );

  const content = !canRenderVideo ? (
    <div className="flex size-full items-center justify-center overflow-hidden bg-[#2f3437]">
      <Image
        className="size-16 rounded-full border border-white/10"
        src={avatarSrc || ""}
      />
    </div>
  ) : (
    <video
      ref={bindVideoRef}
      className="size-full overflow-hidden object-cover"
      autoPlay
      playsInline
      muted
    />
  );

  return (
    <li
      onClick={isSelectable ? () => onSelect(id) : undefined}
      className={`relative aspect-video w-full overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${isSelectable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""}`}
    >
      {content}
      <footer className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-white backdrop-blur-sm">
        {isAudioEnabled ? (
          <TbMicrophoneFilled
            className={
              isSpeaking ? "text-xs text-emerald-300" : "text-xs text-white/35"
            }
          />
        ) : (
          <BiMicrophoneOff className="text-xs text-white/55" />
        )}
        <span className="text-xs">{name}</span>
      </footer>
    </li>
  );
}
