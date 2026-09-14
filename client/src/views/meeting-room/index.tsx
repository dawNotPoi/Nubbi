import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import useMediaStream from "@/hooks/useMedia";
import { message } from "antd";
import { useRef, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MeetingRoomView from "./components/MeetingRoomView";
import { attachMediaStream } from "./helpers/meeting-room";
import { useMeetingPanels } from "./hooks/use-meeting-panels";
import { useMeetingParticipants } from "./hooks/use-meeting-participants";
import { useMeetingSession } from "./hooks/use-meeting-session";
import type {
  MediaDeviceKind,
  MediaToggleKind,
  TrackReplaceHandler,
} from "./types";

type VideoProps = {
  meetingTitle?: string;
  meetingHostId?: string;
  meetingAccessToken: string;
  onAccessRejected: () => void;
};

export default function Video({
  meetingTitle = "",
  meetingHostId = "",
  meetingAccessToken,
  onAccessRejected,
}: VideoProps): ReactElement {
  const { roomId = "room1" } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const media = useMediaStream();
  const { user } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [endingMeeting, setEndingMeeting] = useState(false);
  const session = useMeetingSession({
    roomId,
    meetingAccessToken,
    mediaStream: media.mediaStream,
    videoEnabled: media.videoStatu.open,
    audioEnabled: media.audioStatu.open,
    localVideoRef,
    onAccessRejected,
  });
  const panels = useMeetingPanels(session.meetingComments.length);
  const participantState = useMeetingParticipants({
    user,
    roomUsers: session.roomUsers,
    localPeerId: session.localPeerId,
    remoteStreams: session.remoteStreams,
    mediaStream: media.mediaStream,
    videoEnabled: media.videoStatu.open,
    audioEnabled: media.audioStatu.open,
    isMobile,
    onMobileSelect: panels.closeParticipants,
  });

  const handleSwitchDevice = (
    kind: MediaDeviceKind,
    deviceId: string,
  ): void => {
    const currentStream = media.mediaStream;
    if (!currentStream) return;
    void media.switchDevice(
      kind,
      deviceId,
      (_stream, oldTrack, newTrack) => {
        Object.values(session.peersRef.current).forEach((peer) => {
          peer.replaceTrack(oldTrack, newTrack, currentStream);
        });
      },
      (stream) => attachMediaStream(localVideoRef, stream),
    );
  };

  const replacePeerTrack: TrackReplaceHandler = (
    _stream,
    oldTrack,
    newTrack,
  ): void => {
    const currentStream = media.mediaStream;
    if (!currentStream) return;
    Object.values(session.peersRef.current).forEach((peer) => {
      peer.replaceTrack(oldTrack, newTrack, currentStream);
    });
  };

  const handleDeviceToggle = (
    kind: MediaToggleKind,
    enabled: boolean,
  ): void => {
    void media.toggleDevice(kind, enabled);
  };

  const handleToggleScreenShare = async (): Promise<void> => {
    if (!media.mediaStream) return;
    if (media.isScreenSharing) {
      media.stopScreenShare(replacePeerTrack, (stream) =>
        attachMediaStream(localVideoRef, stream),
      );
      return;
    }
    const success = await media.startScreenShare(
      replacePeerTrack,
      (stream) => attachMediaStream(localVideoRef, stream),
    );
    if (!success) {
      message.error("共享屏幕失败，请检查浏览器权限后重试");
    }
  };

  const handleSendComment = async (content: string): Promise<boolean> => {
    const response = await session.sendMeetingComment(roomId, content);
    if (!response.ok) {
      message.error("评论发送失败，请稍后重试");
      return false;
    }
    return true;
  };

  const isHost = Boolean(
    user?.id && meetingHostId && user.id === meetingHostId,
  );
  const handleEndMeeting = async (): Promise<void> => {
    if (endingMeeting) return;
    if (!isHost) {
      session.destroyPeerConnections();
      message.success("已离开会议");
      navigate("/home", { replace: true });
      return;
    }

    setEndingMeeting(true);
    try {
      const response = await session.endMeeting(roomId);
      if (!response.ok) {
        message.error("结束会议失败，请稍后重试");
        return;
      }
      session.destroyPeerConnections();
      message.success("会议已结束");
      navigate("/home", { replace: true });
    } catch {
      message.error("结束会议失败，请稍后重试");
    } finally {
      setEndingMeeting(false);
    }
  };

  return (
    <MeetingRoomView
      localVideoRef={localVideoRef}
      participants={participantState.participants}
      activeParticipantId={participantState.activeParticipantId}
      isParticipantOpen={panels.isParticipantOpen}
      isCommentOpen={panels.isCommentOpen}
      meetingTitle={meetingTitle}
      currentUserName={user?.name || "Me"}
      currentUserId={user?.id || ""}
      currentUserAvatar={user?.image || ""}
      remoteUsers={participantState.remoteUsers}
      comments={session.meetingComments}
      devices={media.devices}
      videoStatus={media.videoStatu}
      audioStatus={media.audioStatu}
      isScreenSharing={media.isScreenSharing}
      unreadCommentCount={panels.unreadCommentCount}
      endActionLabel={isHost ? "结束会议" : "离开会议"}
      ending={endingMeeting}
      onCloseParticipants={panels.closeParticipants}
      onSelectParticipant={participantState.selectParticipant}
      onCloseComment={panels.closeComment}
      onToggleDevice={handleDeviceToggle}
      onSwitchDevice={handleSwitchDevice}
      onToggleScreenShare={() => void handleToggleScreenShare()}
      onSendComment={handleSendComment}
      onToggleComment={panels.toggleComment}
      onToggleParticipants={panels.toggleParticipants}
      onEndMeeting={() => void handleEndMeeting()}
    />
  );
}
