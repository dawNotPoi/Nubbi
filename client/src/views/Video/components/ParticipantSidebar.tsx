import type { VideoRoomUser } from "../types";
import ParticipantTile from "./ParticipantTile";

type ParticipantSidebarProps = {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  remoteUsers: VideoRoomUser[];
  localName: string;
  localAvatar?: string;
  localVideoEnabled: boolean;
};

export default function ParticipantSidebar({
  localStream,
  remoteStreams,
  remoteUsers,
  localName,
  localAvatar,
  localVideoEnabled,
}: ParticipantSidebarProps) {
  return (
    <aside className="w-[15%] py-10 bg-normal">
      <ul className="min-w-[200px] h-full max-w-[300px] flex gap-1 flex-col overflow-y-scroll justify-center scrollbar-none">
        <ParticipantTile
          name={localName}
          stream={localStream}
          avatarSrc={localAvatar}
          showAvatarFallback
          isVideoEnabled={localVideoEnabled}
        />
        {remoteUsers.map((roomUser) => {
          const stream = remoteStreams[roomUser.peerId] || null;
          const isVideoEnabled =
            stream?.getVideoTracks().some((track) => track.readyState === "live") || false;

          return (
            <ParticipantTile
              key={roomUser.peerId}
              name={roomUser.name || roomUser.peerId}
              stream={stream}
              avatarSrc={roomUser.image || ""}
              isVideoEnabled={isVideoEnabled}
            />
          );
        })}
      </ul>
    </aside>
  );
}
