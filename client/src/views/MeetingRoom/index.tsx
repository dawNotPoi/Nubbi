import { useAuth } from "@/hooks/useAuth";
import useMediaStream from "@/hooks/useMedia";
import useP2PConnection from "@/hooks/useP2PConnection";
import { message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import CommentPanel from "./components/CommentPanel";
import MainVideoStage from "./components/MainVideoStage";
import ParticipantSidebar from "./components/ParticipantSidebar";
import VideoControls from "./components/VideoControls";
import type {
  MediaDeviceKind,
  MediaToggleKind,
  StageParticipant,
} from "./types";

export default function Video() {
  const { roomId = "room1" } = useParams();
  const [isCommentOpen, setIsCommentOpen] = useState(true);
  const [commentCount, setCommentCount] = useState(0);
  const {
    mediaStream,
    devices,
    switchDevice,
    videoStatu,
    audioStatu,
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
    syncRoomUser,
    destroyPeerConnections,
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
    });
    return () => {
      destroyPeerConnections();
    };
  }, [destroyPeerConnections, joinRoom, roomId]);

  //处理建立p2p连接
  useEffect(() => {
    if (!mediaStream) return;
    updateVideo(mediaStream);
    connectToPeer(roomId, mediaStream, {
      id: user?.id,
      name: user?.name,
      image: user?.image,
      email: user?.email,
    });
  }, [connectToPeer, mediaStream, roomId]);

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
    });
  }, [roomId, syncRoomUser, user?.email, user?.id, user?.image, user?.name]);

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
        isVideoEnabled:
          stream
            ?.getVideoTracks()
            .some((track) => track.readyState === "live") || false,
        isAudioEnabled:
          stream
            ?.getAudioTracks()
            .some((track) => track.readyState === "live") || false,
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

  const handleDeviceToggle = (kind: MediaToggleKind, enabled: boolean) => {
    toggleDevice(kind, enabled);
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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#fbfbfa]">
      <main className="flex h-[calc(100vh-40px)] min-w-[1180px] gap-0 overflow-hidden">
        <MainVideoStage videoRef={localVideoRef} participants={participants} />
        {/* 侧边栏 */}
        <ParticipantSidebar
          localStream={mediaStream}
          remoteStreams={remoteStreams}
          remoteUsers={remoteUsers}
          localName={user?.name || "Me"}
          localAvatar={user?.image || ""}
          localVideoEnabled={videoStatu.open}
        />
        {isCommentOpen && (
          <CommentPanel
            currentUserName={user?.name || "Me"}
            currentUserAvatar={user?.image || ""}
            roomUsers={remoteUsers}
            comments={meetingComments}
            onSendComment={handleSendComment}
            onCommentCountChange={setCommentCount}
          />
        )}
      </main>
      <VideoControls
        devices={devices}
        videoStatus={videoStatu}
        audioStatus={audioStatu}
        isCommentOpen={isCommentOpen}
        commentCount={commentCount}
        onToggleDevice={handleDeviceToggle}
        onSwitchDevice={handleSwitchDevice}
        onToggleComment={() => setIsCommentOpen((prev) => !prev)}
      />
    </div>
  );
}
