import useP2PConnection from "@/hooks/useP2PConnection";
import { message } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJoinErrorMessage } from "../helpers/meeting-room";
import type { LocalMedia } from "./use-local-media";

/** 入会阶段，不以信令连接成功代替真正加入房间。 */
export type MeetingConnectionStatus = "connecting" | "joined" | "reconnecting" | "failed";
type SessionOptions = { roomId: string; meetingAccessToken: string; media: LocalMedia; onAccessRejected: () => void };
/** 网络能力及可见入会状态。 */
export type MeetingSessionResult = ReturnType<typeof useP2PConnection> & {
  status: MeetingConnectionStatus; connectionError: string; retryJoin: () => void;
};

/** @param options 已校验的房间及本地媒体。@returns 会议会话；准备页不调用此 Hook。 */
export function useMeetingSession({ roomId, meetingAccessToken, media, onAccessRejected }: SessionOptions): MeetingSessionResult {
  const navigate = useNavigate();
  const session = useP2PConnection();
  const { connectToPeer, destroyPeerConnections, joinRoom, meetingEndedAt, reconnectEpoch, syncRoomUser, transportConnected, reconnect } = session;
  const [status, setStatus] = useState<MeetingConnectionStatus>("connecting");
  const [connectionError, setConnectionError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const hasJoined = useRef(false);
  const currentMedia = useRef(media);
  currentMedia.current = media;
  const retryJoin = useCallback((): void => { reconnect(); setAttempt((value) => value + 1); }, [reconnect]);

  useEffect(() => {
    if (!transportConnected) {
      setStatus(hasJoined.current ? "reconnecting" : "connecting");
      const timer = window.setTimeout(() => { setStatus("failed"); setConnectionError("信令连接超时，请检查网络后重试。"); }, 10_000);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    setStatus(hasJoined.current ? "reconnecting" : "connecting");
    setConnectionError("");
    const localMedia = currentMedia.current;
    connectToPeer(roomId, localMedia.stream);
    void joinRoom(roomId, meetingAccessToken, {
      isVideoEnabled: localMedia.video.open || localMedia.sharing,
      isAudioEnabled: localMedia.audio.open,
      isScreenSharing: localMedia.sharing,
    }).then((response) => {
      if (cancelled) return;
      if (response.ok) { hasJoined.current = true; setStatus("joined"); return; }
      const reason = getJoinErrorMessage(response.reason);
      setStatus("failed"); setConnectionError(reason);
      if (["INVALID_ACCESS", "MEETING_ENDED", "MEETING_NOT_FOUND", "MEETING_NOT_APPROVED"].includes(response.reason || "")) {
        currentMedia.current.release(); message.error(reason); onAccessRejected();
      }
    });
    return () => { cancelled = true; };
  }, [attempt, connectToPeer, destroyPeerConnections, joinRoom, meetingAccessToken, onAccessRejected, reconnectEpoch, roomId, transportConnected]);

  useEffect(() => () => destroyPeerConnections(), [destroyPeerConnections, roomId, meetingAccessToken]);

  useEffect(() => {
    if (status !== "joined") return;
    connectToPeer(roomId, media.stream);
    syncRoomUser(roomId, {
      isVideoEnabled: media.video.open || media.sharing,
      isAudioEnabled: media.audio.open,
      isScreenSharing: media.sharing,
    });
  }, [connectToPeer, media.audio.open, media.video.open, media.sharing, media.stream, media.revision, roomId, status, syncRoomUser]);

  useEffect(() => {
    if (!meetingEndedAt) return;
    currentMedia.current.release();
    message.info("会议已结束");
    navigate("/meetings", { replace: true });
  }, [meetingEndedAt, navigate]);
  return { ...session, status, connectionError, retryJoin };
}
