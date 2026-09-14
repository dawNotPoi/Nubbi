import Image from "@/component/UI/Image";
import { useCallback, useRef } from "react";
import { TbMicrophoneFilled } from "react-icons/tb";

type ParticipantTileProps = {
  name: string;
  stream: MediaStream | null;
  avatarSrc?: string;
  showAvatarFallback?: boolean;
  isVideoEnabled?: boolean;
};

export default function ParticipantTile({
  name,
  stream,
  avatarSrc,
  showAvatarFallback = false,
  isVideoEnabled = true,
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

  const content = showAvatarFallback && !isVideoEnabled ? (
    <div className="size-full overflow-hidden bg-black flex justify-center items-center">
      <Image className="size-[5rem] rounded-full" src={avatarSrc || ""} />
    </div>
  ) : (
    <video
      ref={bindVideoRef}
      className="size-full overflow-hidden object-cover"
      autoPlay
      playsInline
      muted={showAvatarFallback}
    />
  );

  return (
    <li className="w-full relative aspect-video">
      {content}
      <footer className="absolute flex gap-1 items-center text-white bottom-1 left-0">
        <TbMicrophoneFilled />
        <span className="text-xs">{name}</span>
      </footer>
    </li>
  );
}
