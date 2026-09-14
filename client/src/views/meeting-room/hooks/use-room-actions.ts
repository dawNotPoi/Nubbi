import { message } from "antd";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LocalMedia } from "./use-local-media";
import type { MeetingSessionResult } from "./use-meeting-session";

type RoomActions = { exitOpen: boolean; ending: boolean; openExit: () => void; closeExit: () => void;
  leave: () => void; end: () => Promise<void>; sendComment: (content: string) => Promise<boolean> };
type Options = { roomId: string; media: LocalMedia; session: MeetingSessionResult; isHost: boolean };

/** @param options 当前会议、媒体和身份。@returns 有错误反馈的退出与聊天操作；不自动重发。 */
export function useRoomActions({ roomId, media, session, isHost }: Options): RoomActions {
  const navigate = useNavigate();
  const [exitOpen, setExitOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const endingRef = useRef(false);
  const leave = useCallback((): void => {
    media.release(); session.destroyPeerConnections(); navigate("/meetings", { replace: true });
  }, [media, session, navigate]);
  const end = async (): Promise<void> => {
    if (!isHost || endingRef.current) return;
    endingRef.current = true; setEnding(true);
    try {
      const response = await session.endMeeting(roomId);
      if (response.ok) { leave(); return; }
      message.error(response.reason === "TIMEOUT" ? "结束请求确认超时，会议可能已结束，请检查连接和会议状态。" : "无法结束会议，请等待网络恢复后重试。");
    } finally { endingRef.current = false; setEnding(false); }
  };
  const sendComment = async (content: string): Promise<boolean> => {
    if (session.status !== "joined" || !session.transportConnected) { message.warning("尚未连接会议，请等待连接恢复后发送。"); return false; }
    const response = await session.sendMeetingComment(roomId, content);
    if (!response.ok) message.error(response.reason === "TIMEOUT" ? "发送确认超时，消息可能已送达。草稿已保留，请查看聊天记录后决定是否重发。" : "消息未确认送达，草稿已保留，请在网络恢复后检查记录。");
    return response.ok;
  };
  return { exitOpen, ending, openExit: () => setExitOpen(true), closeExit: () => setExitOpen(false), leave, end, sendComment };
}
