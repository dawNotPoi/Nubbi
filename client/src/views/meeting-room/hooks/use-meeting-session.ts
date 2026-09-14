import useP2PConnection from "@/hooks/useP2PConnection";
import { message } from "antd";
import { useEffect, useRef, type MutableRefObject } from "react";
import { useNavigate } from "react-router-dom";
import {
  attachMediaStream,
  getJoinErrorMessage,
} from "../helpers/meeting-room";

export type RoomMediaState = {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
};

type UseMeetingSessionOptions = {
  roomId: string;
  meetingAccessToken: string;
  mediaStream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  onAccessRejected: () => void;
};

export type MeetingSessionResult = ReturnType<typeof useP2PConnection>;

export const useMeetingSession = ({
  roomId,
  meetingAccessToken,
  mediaStream,
  videoEnabled,
  audioEnabled,
  localVideoRef,
  onAccessRejected,
}: UseMeetingSessionOptions): MeetingSessionResult => {
  const navigate = useNavigate();
  const session = useP2PConnection();
  const {
    connectToPeer,
    destroyPeerConnections,
    joinRoom,
    meetingEndedAt,
    reconnectEpoch,
    syncRoomUser,
  } = session;
  const currentMediaRef = useRef<RoomMediaState>({
    isVideoEnabled: videoEnabled,
    isAudioEnabled: audioEnabled,
  });

  useEffect(() => {
    currentMediaRef.current = {
      isVideoEnabled: videoEnabled,
      isAudioEnabled: audioEnabled,
    };
  }, [audioEnabled, videoEnabled]);

  useEffect(() => {
    let cancelled = false;
    void joinRoom(roomId, meetingAccessToken, currentMediaRef.current).then(
      (response) => {
        if (cancelled || response.ok) return;
        message.error(getJoinErrorMessage(response.reason));
        onAccessRejected();
      },
    );

    return () => {
      cancelled = true;
      destroyPeerConnections();
    };
  }, [
    destroyPeerConnections,
    joinRoom,
    meetingAccessToken,
    onAccessRejected,
    reconnectEpoch,
    roomId,
  ]);

  useEffect(() => {
    if (mediaStream) {
      attachMediaStream(localVideoRef, mediaStream);
    }
    connectToPeer(roomId, mediaStream);
  }, [
    connectToPeer,
    localVideoRef,
    mediaStream,
    reconnectEpoch,
    roomId,
  ]);

  useEffect(() => {
    if (!mediaStream) return;
    attachMediaStream(localVideoRef, mediaStream);
  }, [localVideoRef, mediaStream]);

  useEffect(() => {
    syncRoomUser(roomId, {
      isVideoEnabled: videoEnabled,
      isAudioEnabled: audioEnabled,
    });
  }, [audioEnabled, roomId, syncRoomUser, videoEnabled]);

  useEffect(() => {
    if (!meetingEndedAt) return;
    message.info("会议已结束");
    navigate("/home", { replace: true });
  }, [meetingEndedAt, navigate]);

  return session;
};
