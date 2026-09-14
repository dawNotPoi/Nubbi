import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useRef, type ReactElement } from "react";
import { useParams } from "react-router-dom";
import MeetingRoomView from "./components/MeetingRoomView";
import { MeetingExitDialog } from "./components/meeting-exit-dialog";
import { useMeetingPanels } from "./hooks/use-meeting-panels";
import { useMeetingParticipants } from "./hooks/use-meeting-participants";
import { useMeetingSession } from "./hooks/use-meeting-session";
import { useRoomActions } from "./hooks/use-room-actions";
import { useMeetingChat } from "./hooks/use-meeting-chat";
import { useMeetingStage } from "./hooks/use-meeting-stage";
import type { LocalMedia } from "./hooks/use-local-media";
import type { MeetingRoomProps } from "./types";

/** @param props 已主动加入的会议及准备好的媒体。@returns 实际会议会话和退出确认。 */
export function ActiveMeetingRoom({ meetingTitle = "", meetingHostId = "", meetingStartTime, meetingAccessToken, onAccessRejected, media }: MeetingRoomProps & { media: LocalMedia }): ReactElement {
  const { roomId = "" } = useParams();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const session = useMeetingSession({ roomId, meetingAccessToken, media, onAccessRejected });
  const panels = useMeetingPanels(session.meetingComments.length);
  const participants = useMeetingParticipants({ user, roomUsers: session.roomUsers, localPeerId: session.localPeerId,
    remoteStreams: session.remoteStreams, mediaStream: media.stream, videoEnabled: media.video.open || media.sharing,
    audioEnabled: media.audio.open, screenSharing: media.sharing });
  const stage = useMeetingStage(participants.participants);
  const isHost = Boolean(user?.id && user.id === meetingHostId);
  const actions = useRoomActions({ roomId, media, session, isHost });
  const chat = useMeetingChat(actions.sendComment);
  /** @param participantId 用户选择的成员。@returns 无；手机固定后让出主画面空间。 */
  const toggleParticipantPin = (participantId: string): void => {
    stage.togglePin(participantId);
    if (isMobile) panels.closeParticipants();
  };
  return <>
    <MeetingRoomView localVideoRef={localVideoRef} participants={participants.participants} stage={stage} chat={chat} localPeerId={session.localPeerId}
      peerStatuses={session.peerStatuses} roomUsers={session.roomUsers} onRetryPeer={session.retryPeer} iceWarning={session.iceWarning}
      isParticipantOpen={panels.isParticipantOpen} isCommentOpen={panels.isCommentOpen} meetingTitle={meetingTitle}
      roomId={roomId} meetingStartTime={meetingStartTime} connectionStatus={session.status} connectionError={session.connectionError}
      onRetryConnection={session.retryJoin} mediaErrors={media.errors} mediaBusy={media.busy}
      currentUserName={user?.name || "我"} currentUserId={user?.id || ""} currentUserAvatar={user?.image || ""}
      remoteUsers={participants.remoteUsers} comments={session.meetingComments} devices={media.devices}
      videoStatus={media.video} audioStatus={media.audio} isScreenSharing={media.sharing} unreadCommentCount={panels.unreadCommentCount}
      endActionLabel="离开会议" ending={actions.ending} onCloseParticipants={panels.closeParticipants} onSelectParticipant={toggleParticipantPin}
      onCloseComment={panels.closeComment} onToggleDevice={(kind, enabled) => void media.toggle(kind, enabled)}
      onSwitchDevice={(kind, id) => void media.select(kind === "audioinput" ? "audio" : "video", id)}
      onToggleScreenShare={() => { if (media.sharing) media.stopScreenShare(); else void media.startScreenShare(); }}
      onToggleComment={panels.toggleComment} onToggleParticipants={panels.toggleParticipants} onEndMeeting={actions.openExit} />
    {actions.exitOpen && <MeetingExitDialog open isHost={isHost} busy={actions.ending} onCancel={actions.closeExit} onLeave={actions.leave} onEnd={actions.end} />}
  </>;
}
