import { useMemo } from "react";
import type { StageParticipant, VideoRoomUser } from "../types";

/** 当前登录用户用于会议展示的公开信息。 */
type ParticipantUser = { name?: string | null; image?: string | null };
type ParticipantOptions = {
  user?: ParticipantUser;
  roomUsers: Record<string, VideoRoomUser>;
  localPeerId: string;
  remoteStreams: Record<string, MediaStream>;
  mediaStream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
};

/** 全部参会成员与远端成员；布局筛选不修改此列表，以免影响音频播放。 */
export type MeetingParticipantsResult = {
  remoteUsers: VideoRoomUser[];
  participants: StageParticipant[];
};

/**
 * 将本地设备和远端成员快照转换为统一的展示数据，不决定画面布局。
 * @param options 当前身份、媒体及服务端成员状态。
 * @returns 含共享状态的成员列表，隐藏自己只在展示层执行。
 */
export function useMeetingParticipants(options: ParticipantOptions): MeetingParticipantsResult {
  const { user, roomUsers, localPeerId, remoteStreams, mediaStream, videoEnabled, audioEnabled, screenSharing } = options;
  const remoteUsers = useMemo(
    () => Object.values(roomUsers).filter((member) => member.peerId !== localPeerId),
    [localPeerId, roomUsers],
  );
  const participants = useMemo<StageParticipant[]>(() => [
    {
      id: "local-user",
      name: user?.name || "我",
      avatarSrc: user?.image || "",
      stream: mediaStream,
      isVideoEnabled: videoEnabled,
      isAudioEnabled: audioEnabled,
      isScreenSharing: screenSharing,
      isLocal: true,
    },
    ...remoteUsers.map((member) => ({
      id: member.peerId,
      name: member.name || "参会成员",
      avatarSrc: member.image || "",
      stream: remoteStreams[member.peerId] || null,
      isVideoEnabled: member.isVideoEnabled,
      isAudioEnabled: member.isAudioEnabled,
      isScreenSharing: member.isScreenSharing ?? false,
    })),
  ], [audioEnabled, mediaStream, remoteStreams, remoteUsers, screenSharing, user?.image, user?.name, videoEnabled]);
  return { remoteUsers, participants };
}
