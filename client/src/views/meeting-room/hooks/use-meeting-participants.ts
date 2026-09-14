import { useCallback, useEffect, useMemo, useState } from "react";
import { hasVideoTrack } from "../helpers/meeting-room";
import type { StageParticipant, VideoRoomUser } from "../types";

type ParticipantUser = {
  name?: string | null;
  image?: string | null;
};

type UseMeetingParticipantsOptions = {
  user?: ParticipantUser;
  roomUsers: Record<string, VideoRoomUser>;
  localPeerId: string;
  remoteStreams: Record<string, MediaStream>;
  mediaStream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  isMobile: boolean;
  onMobileSelect: () => void;
};

export type MeetingParticipantsResult = {
  remoteUsers: VideoRoomUser[];
  participants: StageParticipant[];
  activeParticipantId?: string;
  selectParticipant: (participantId: string) => void;
};

export const useMeetingParticipants = ({
  user,
  roomUsers,
  localPeerId,
  remoteStreams,
  mediaStream,
  videoEnabled,
  audioEnabled,
  isMobile,
  onMobileSelect,
}: UseMeetingParticipantsOptions): MeetingParticipantsResult => {
  const [activeParticipantId, setActiveParticipantId] = useState<string>();
  const remoteUsers = useMemo(
    () =>
      Object.values(roomUsers).filter(
        (roomUser) => roomUser.peerId !== localPeerId,
      ),
    [localPeerId, roomUsers],
  );
  const participants = useMemo<StageParticipant[]>(() => {
    const localParticipant: StageParticipant = {
      id: "local-user",
      name: user?.name || "Me",
      avatarSrc: user?.image || "",
      stream: mediaStream,
      isVideoEnabled: videoEnabled,
      isAudioEnabled: audioEnabled,
      isLocal: true,
    };
    const remoteParticipants = remoteUsers.map((roomUser) => ({
      id: roomUser.peerId,
      name: roomUser.name || roomUser.peerId,
      avatarSrc: roomUser.image || "",
      stream: remoteStreams[roomUser.peerId] || null,
      isVideoEnabled: roomUser.isVideoEnabled,
      isAudioEnabled: roomUser.isAudioEnabled,
    }));
    return [localParticipant, ...remoteParticipants];
  }, [
    audioEnabled,
    mediaStream,
    remoteStreams,
    remoteUsers,
    user?.image,
    user?.name,
    videoEnabled,
  ]);
  const videoParticipants = useMemo(
    () =>
      participants.filter(
        (participant) =>
          participant.isVideoEnabled && hasVideoTrack(participant.stream),
      ),
    [participants],
  );

  useEffect(() => {
    if (videoParticipants.length === 0) {
      setActiveParticipantId(undefined);
      return;
    }
    const hasActiveParticipant = videoParticipants.some(
      (participant) => participant.id === activeParticipantId,
    );
    if (!hasActiveParticipant) {
      setActiveParticipantId(videoParticipants[0]?.id);
    }
  }, [activeParticipantId, videoParticipants]);

  const selectParticipant = useCallback(
    (participantId: string): void => {
      const participant = participants.find(
        (item) => item.id === participantId,
      );
      if (
        !participant?.isVideoEnabled ||
        !hasVideoTrack(participant.stream)
      ) {
        return;
      }
      setActiveParticipantId(participantId);
      if (isMobile) onMobileSelect();
    },
    [isMobile, onMobileSelect, participants],
  );

  return {
    remoteUsers,
    participants,
    activeParticipantId,
    selectParticipant,
  };
};
