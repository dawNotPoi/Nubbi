import Image from "@/component/UI/Image";
import { useCallback, useRef } from "react";
import { TbMicrophoneFilled } from "react-icons/tb";

type ParticipantTileProps = {
  name: string;
  stream: MediaStream | null;
  avatarSrc?: string;

  isVideoEnabled?: boolean;
};

export default function ParticipantTile({
  name,
  stream,
  avatarSrc,

  isVideoEnabled = false,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const bindVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      videoRef.current = element;
      if (!element) return;
      if (element.srcObject !== stream) {
        element.srcObject = stream;
      }
    },
    [stream],
  );

  const content = !isVideoEnabled ? (
    <div className="flex size-full items-center justify-center overflow-hidden bg-[#2f3437]">
      <Image className="size-16 rounded-full border border-white/10" src={avatarSrc || ""} />
    </div>
  ) : (
    <video
      ref={bindVideoRef}
      className="size-full overflow-hidden object-cover"
      autoPlay
      playsInline
    />
  );

  return (
    <li className="relative w-full overflow-hidden rounded-2xl border border-[#ecebe8] bg-white shadow-sm aspect-video">
      {content}
      <footer className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-white backdrop-blur-sm">
        <TbMicrophoneFilled className="text-xs" />
        <span className="text-xs">{name}</span>
      </footer>
    </li>
  );
}
