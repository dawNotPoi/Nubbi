import { useAuth } from "@/hooks/useAuth";
import useMediaStream from "@/hooks/useMedia";
import useP2PConnection from "@/hooks/useP2PConnection";
import { useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
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
    localPeerId,
    connectToPeer,
    destroyPeerConnections,
    peersRef,
  } = useP2PConnection();

  const updateVideo = (stream: MediaStream) => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = null;
    localVideoRef.current.srcObject = stream;
  };

  useEffect(() => {
    if (mediaStream) {
      updateVideo(mediaStream);
      connectToPeer(roomId, mediaStream, {
        id: user?.id,
        name: user?.name,
        image: user?.image,
        email: user?.email,
      });
    }

    return () => {
      destroyPeerConnections();
    };
  }, [
    connectToPeer,
    destroyPeerConnections,
    mediaStream,
    roomId,
    user?.email,
    user?.id,
    user?.image,
    user?.name,
  ]);

  const remoteUsers = useMemo(
    () =>
      Object.values(roomUsers).filter(
        (roomUser) => roomUser.peerId !== localPeerId,
      ),
    [localPeerId, roomUsers],
  );
  console.log(remoteUsers);

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

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col">
      <main className="h-[calc(100vh-40px)] min-w-[800px] flex gap-1">
        <MainVideoStage videoRef={localVideoRef} participants={participants} />
        <ParticipantSidebar
          localStream={mediaStream}
          remoteStreams={remoteStreams}
          remoteUsers={remoteUsers}
          localName={user?.name || "Me"}
          localAvatar={user?.image || ""}
          localVideoEnabled={videoStatu.open}
        />
      </main>
      <VideoControls
        devices={devices}
        videoStatus={videoStatu}
        audioStatus={audioStatu}
        onToggleDevice={handleDeviceToggle}
        onSwitchDevice={handleSwitchDevice}
      />
    </div>
  );
}
