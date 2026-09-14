import type { MutableRefObject, ReactElement } from "react";
import type {
  DeviceStatus,
  MediaDeviceKind,
  MediaDevices,
  MediaToggleKind,
  MeetingComment,
  StageParticipant,
  VideoRoomUser,
} from "../types";
import CommentPanel from "./CommentPanel";
import MainVideoStage from "./MainVideoStage";
import ParticipantSidebar from "./ParticipantSidebar";
import VideoControls from "./VideoControls";
import { Alert, Button } from "antd";
import { MeetingInvitationButton } from "@/features/meeting/meeting-invitation";
import { RemoteAudio } from "./remote-audio";
import type { MeetingConnectionStatus } from "../hooks/use-meeting-session";
import type { MediaSnapshot } from "../media/media-state";
import { ConnectionDiagnostics } from "./connection-diagnostics";
import type { PeerStatusMap } from "@/hooks/meeting/p2p/connection-types";
import type { RoomUserMap } from "@/hooks/meeting/p2p/types";

type MeetingRoomViewProps = {
  peerStatuses: PeerStatusMap;
  roomUsers: RoomUserMap;
  onRetryPeer: (peerId: string) => void;
  iceWarning: string;
  roomId: string;
  meetingStartTime?: string | number | Date;
  connectionStatus: MeetingConnectionStatus;
  connectionError: string;
  onRetryConnection: () => void;
  mediaErrors: MediaSnapshot["errors"];
  mediaBusy: MediaSnapshot["busy"];
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  participants: StageParticipant[];
  activeParticipantId?: string;
  isParticipantOpen: boolean;
  isCommentOpen: boolean;
  meetingTitle: string;
  currentUserName: string;
  currentUserId: string;
  currentUserAvatar: string;
  remoteUsers: VideoRoomUser[];
  comments: MeetingComment[];
  devices: MediaDevices;
  videoStatus: DeviceStatus;
  audioStatus: DeviceStatus;
  isScreenSharing: boolean;
  unreadCommentCount: number;
  endActionLabel: string;
  ending: boolean;
  onCloseParticipants: () => void;
  onSelectParticipant: (participantId: string) => void;
  onCloseComment: () => void;
  onToggleDevice: (kind: MediaToggleKind, enabled: boolean) => void;
  onSwitchDevice: (kind: MediaDeviceKind, deviceId: string) => void;
  onToggleScreenShare: () => void;
  onSendComment: (content: string) => Promise<boolean>;
  onToggleComment: () => void;
  onToggleParticipants: () => void;
  onEndMeeting: () => void;
};

/** @param props 会议状态与用户操作。@returns 会议画面、状态反馈及控制栏。 */
export default function MeetingRoomView({
  peerStatuses, roomUsers, onRetryPeer, iceWarning,
  roomId, meetingStartTime, connectionStatus, connectionError, onRetryConnection, mediaErrors, mediaBusy,
  localVideoRef,
  participants,
  activeParticipantId,
  isParticipantOpen,
  isCommentOpen,
  meetingTitle,
  currentUserName,
  currentUserId,
  currentUserAvatar,
  remoteUsers,
  comments,
  devices,
  videoStatus,
  audioStatus,
  isScreenSharing,
  unreadCommentCount,
  endActionLabel,
  ending,
  onCloseParticipants,
  onSelectParticipant,
  onCloseComment,
  onToggleDevice,
  onSwitchDevice,
  onToggleScreenShare,
  onSendComment,
  onToggleComment,
  onToggleParticipants,
  onEndMeeting,
}: MeetingRoomViewProps): ReactElement {
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-bg-panel">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border-row px-3 py-2">
        <div className="min-w-0"><h1 className="truncate font-medium text-text-primary">{meetingTitle || "会议"}</h1>
          <p role="status" className="text-xs text-text-muted">{connectionStatus === "joined" ? "已加入会议" : connectionStatus === "reconnecting" ? "连接已断开，正在重新加入…" : connectionStatus === "failed" ? "连接失败" : "正在连接会议…"}</p></div>
        <MeetingInvitationButton id={roomId} title={meetingTitle} startTime={meetingStartTime} />
      </header>
      <ConnectionDiagnostics statuses={peerStatuses} users={roomUsers} onRetry={onRetryPeer} online={connectionStatus === "joined"} iceWarning={iceWarning} />
      {connectionStatus === "failed" && <Alert type="warning" message={connectionError} action={<Button onClick={onRetryConnection}>重新连接</Button>} />}
      {Object.entries(mediaErrors).filter(([, error]) => error).map(([kind, error]) => <Alert key={kind} type="warning" showIcon message={error} />)}
      <RemoteAudio participants={participants} />
      <main className="relative flex min-h-0 min-w-0 flex-1 gap-0 overflow-hidden">
        <MainVideoStage
          videoRef={localVideoRef}
          participants={participants}
          activeParticipantId={activeParticipantId}
        />
        <ParticipantSidebar
          participants={participants}
          activeParticipantId={activeParticipantId}
          open={isParticipantOpen}
          onClose={onCloseParticipants}
          onSelectParticipant={onSelectParticipant}
        />
        {isCommentOpen && (
          <CommentPanel
            meetingTitle={meetingTitle}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            roomUsers={remoteUsers}
            comments={comments}
            onClose={onCloseComment}
            onSendComment={onSendComment}
          />
        )}
      </main>
      <VideoControls
        busy={mediaBusy}
        devices={devices}
        videoStatus={videoStatus}
        audioStatus={audioStatus}
        isScreenSharing={isScreenSharing}
        isCommentOpen={isCommentOpen}
        isParticipantOpen={isParticipantOpen}
        participantCount={participants.length}
        commentCount={unreadCommentCount}
        endActionLabel={endActionLabel}
        ending={ending}
        onToggleDevice={onToggleDevice}
        onSwitchDevice={onSwitchDevice}
        onToggleScreenShare={onToggleScreenShare}
        onSendComment={onSendComment}
        onToggleComment={onToggleComment}
        onToggleParticipants={onToggleParticipants}
        onEndMeeting={onEndMeeting}
      />
    </div>
  );
}
