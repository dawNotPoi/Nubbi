import { useAuth } from "@/hooks/useAuth";
import useMediaStream from "@/hooks/useMedia";
import useP2PConnection from "@/hooks/useP2PConnection";
import { message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CommentPanel from "./components/CommentPanel";
import MainVideoStage from "./components/MainVideoStage";
import ParticipantSidebar from "./components/ParticipantSidebar";
import VideoControls from "./components/VideoControls";
import type {
  MediaDeviceKind,
  MediaToggleKind,
  StageParticipant,
  TrackReplaceHandler,
} from "./types";

const hasVideoTrack = (stream: MediaStream | null) =>
  Boolean(stream?.getVideoTracks().length);

export default function Video({
  meetingTitle = "",
  meetingHostId = "",
}: {
  meetingTitle?: string;
  meetingHostId?: string;
}) {
  const { roomId = "room1" } = useParams();
  const navigate = useNavigate();
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [unreadCommentCount, setUnreadCommentCount] = useState(0);
  const [activeParticipantId, setActiveParticipantId] = useState<string>();
  const [endingMeeting, setEndingMeeting] = useState(false);
  const previousCommentCountRef = useRef(0);
  const {
    mediaStream,
    devices,
    switchDevice,
    videoStatu,
    audioStatu,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    toggleDevice,
  } = useMediaStream();
  const { user } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const {
    remoteStreams,
    roomUsers,
    meetingComments,
    localPeerId,
    joinRoom,
    connectToPeer,
    sendMeetingComment,
    endMeeting,
    syncRoomUser,
    destroyPeerConnections,
    meetingEndedAt,
    peersRef,
  } = useP2PConnection();

  const updateVideo = (stream: MediaStream) => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = null;
    localVideoRef.current.srcObject = stream;
  };

  //处理加入房间事件
  useEffect(() => {
    joinRoom(roomId, {
      id: user?.id,
      name: user?.name,
      image: user?.image,
      email: user?.email,
      isVideoEnabled: videoStatu.open,
      isAudioEnabled: audioStatu.open,
    });
    return () => {
      destroyPeerConnections();
    };
  }, [destroyPeerConnections, joinRoom, roomId]);

  //处理建立p2p连接
  useEffect(() => {
    if (mediaStream) {
      updateVideo(mediaStream);
    }
    connectToPeer(roomId, mediaStream, {
      id: user?.id,
      name: user?.name,
      image: user?.image,
      email: user?.email,
      isVideoEnabled: videoStatu.open,
      isAudioEnabled: audioStatu.open,
    });
  }, [
    connectToPeer,
    mediaStream,
    roomId,
    user?.email,
    user?.id,
    user?.image,
    user?.name,
  ]);

  useEffect(() => {
    if (!mediaStream) return;

    updateVideo(mediaStream);
  }, [mediaStream]);

  useEffect(() => {
    syncRoomUser(roomId, {
      id: user?.id,
      name: user?.name,
      image: user?.image,
      email: user?.email,
      isVideoEnabled: videoStatu.open,
      isAudioEnabled: audioStatu.open,
    });
  }, [
    audioStatu.open,
    roomId,
    syncRoomUser,
    user?.email,
    user?.id,
    user?.image,
    user?.name,
    videoStatu.open,
  ]);

  useEffect(() => {
    if (!meetingEndedAt) return;

    message.info("主持人已结束会议");
    navigate("/home", { replace: true });
  }, [meetingEndedAt, navigate]);

  useEffect(() => {
    if (isCommentOpen) {
      setUnreadCommentCount(0);
      previousCommentCountRef.current = meetingComments.length;
      return;
    }

    const nextUnreadCount = meetingComments.length - previousCommentCountRef.current;
    if (nextUnreadCount > 0) {
      setUnreadCommentCount((prev) => prev + nextUnreadCount);
    }

    previousCommentCountRef.current = meetingComments.length;
  }, [isCommentOpen, meetingComments.length]);

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
      isVideoEnabled: videoStatu.open,
      isAudioEnabled: audioStatu.open,
      isLocal: true,
    };

    const remoteParticipants = remoteUsers.map((roomUser) => {
      const stream = remoteStreams[roomUser.peerId] || null;

      return {
        id: roomUser.peerId,
        name: roomUser.name || roomUser.peerId,
        avatarSrc: roomUser.image || "",
        stream,
        isVideoEnabled: roomUser.isVideoEnabled,
        isAudioEnabled: roomUser.isAudioEnabled,
      };
    });

    return [localParticipant, ...remoteParticipants];
  }, [
    audioStatu.open,
    mediaStream,
    remoteStreams,
    remoteUsers,
    user?.image,
    user?.name,
    videoStatu.open,
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

  const handleSwitchDevice = (kind: MediaDeviceKind, deviceId: string) => {
    if (!mediaStream) return;

    switchDevice(
      kind,
      deviceId,
      (_, oldTrack, newTrack) => {
        Object.values(peersRef.current).forEach((peer) => {
          peer.replaceTrack(oldTrack, newTrack, mediaStream);
        });
      },
      (stream) => {
        updateVideo(stream);
      },
    );
  };

  const replacePeerTrack: TrackReplaceHandler = (_, oldTrack, newTrack) => {
    if (!mediaStream) return;

    Object.values(peersRef.current).forEach((peer) => {
      peer.replaceTrack(oldTrack, newTrack, mediaStream);
    });
  };

  const handleDeviceToggle = (kind: MediaToggleKind, enabled: boolean) => {
    toggleDevice(kind, enabled);
  };

  const handleSelectParticipant = (participantId: string) => {
    const participant = participants.find((item) => item.id === participantId);

    if (!participant?.isVideoEnabled || !hasVideoTrack(participant.stream)) {
      return;
    }

    setActiveParticipantId(participantId);
  };

  const handleToggleScreenShare = async () => {
    if (!mediaStream) return;

    if (isScreenSharing) {
      stopScreenShare(replacePeerTrack, updateVideo);
      return;
    }

    const success = await startScreenShare(replacePeerTrack, updateVideo);

    if (!success) {
      message.error("共享屏幕失败，请检查浏览器权限后重试");
    }
  };

  const handleSendComment = async (content: string) => {
    const response = await sendMeetingComment(roomId, content, {
      id: user?.id,
      name: user?.name,
      image: user?.image,
      email: user?.email,
    });

    if (!response.ok) {
      message.error("评论发送失败，请稍后重试");
      return false;
    }

    return true;
  };

  const isHost = Boolean(user?.id && meetingHostId && user.id === meetingHostId);

  const handleEndMeeting = async () => {
    if (endingMeeting) return;

    if (!isHost) {
      destroyPeerConnections();
      message.success("已离开会议");
      navigate("/home", { replace: true });
      return;
    }

    setEndingMeeting(true);
    try {
      const response = await endMeeting(roomId, user?.id);
      if (!response.ok) {
        message.error("结束会议失败，请稍后重试");
        return;
      }
      destroyPeerConnections();
      message.success("会议已结束");
      navigate("/home", { replace: true });
    } catch {
      message.error("结束会议失败，请稍后重试");
    } finally {
      setEndingMeeting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#fbfbfa]">
      <main className="flex h-[calc(100vh-40px)] min-w-[1180px] gap-0 overflow-hidden">
        <MainVideoStage
          videoRef={localVideoRef}
          participants={participants}
          activeParticipantId={activeParticipantId}
        />
        {/* 侧边栏 */}
        <ParticipantSidebar
          participants={participants}
          activeParticipantId={activeParticipantId}
          onSelectParticipant={handleSelectParticipant}
        />
        {isCommentOpen && (
          <CommentPanel
            meetingTitle={meetingTitle}
            currentUserName={user?.name || "Me"}
            currentUserAvatar={user?.image || ""}
            roomUsers={remoteUsers}
            comments={meetingComments}
            onSendComment={handleSendComment}
          />
        )}
      </main>
      <VideoControls
        devices={devices}
        videoStatus={videoStatu}
        audioStatus={audioStatu}
        isScreenSharing={isScreenSharing}
        isCommentOpen={isCommentOpen}
        commentCount={unreadCommentCount}
        endActionLabel={isHost ? "结束会议" : "离开会议"}
        ending={endingMeeting}
        onToggleDevice={handleDeviceToggle}
        onSwitchDevice={handleSwitchDevice}
        onToggleScreenShare={handleToggleScreenShare}
        onSendComment={handleSendComment}
        onToggleComment={() => setIsCommentOpen((prev) => !prev)}
        onEndMeeting={() => void handleEndMeeting()}
      />
    </div>
  );
}
