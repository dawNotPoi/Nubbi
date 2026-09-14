import { message } from "antd";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LocalMedia } from "./use-local-media";
import type { MeetingSessionResult } from "./use-meeting-session";
import type { CommentSendOutcome } from "../types";

type RoomActions = { exitOpen: boolean; ending: boolean; openExit: () => void; closeExit: () => void;
  leave: () => void; end: () => Promise<void>; sendComment: (content: string) => Promise<CommentSendOutcome> };
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
  /** @param content 要发送的内容。@returns 供两个输入入口共用的结果，不弹出重复通知。 */
  const sendComment = async (content: string): Promise<CommentSendOutcome> => {
    if (session.status !== "joined" || !session.transportConnected) {
      return { status: "failed", message: "尚未连接会议，消息未发送。草稿已保留，请等待连接恢复。" };
    }
    const response = await session.sendMeetingComment(roomId, content);
    if (response.ok) return { status: "sent", message: "消息已发送" };
    if (response.reason === "TIMEOUT" || response.reason === "DISCONNECTED") {
      return { status: "uncertain", message: "发送结果未确认，消息可能已送达。请先查看聊天记录，再决定是否重发。" };
    }
    return { status: "failed", message: "消息发送失败，草稿已保留。请检查连接和会议状态后重试。" };
  };
  return { exitOpen, ending, openExit: () => setExitOpen(true), closeExit: () => setExitOpen(false), leave, end, sendComment };
}
