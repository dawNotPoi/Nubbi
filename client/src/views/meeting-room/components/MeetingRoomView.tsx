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

type MeetingRoomViewProps = {
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

export default function MeetingRoomView({
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
