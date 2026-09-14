import { findRealtimeMeetingComments } from "@/controller/meeting/realtime";
import logger from "@/common/logger";
import type { Socket } from "socket.io";
import { getSocketRoom } from "./room-state";

/** @param socket 已入会连接。@param roomId 会议 ID。@returns 无；历史失败不影响入会，晚到结果不跨房间发布。 */
export function publishCommentSnapshot(socket: Socket, roomId: string): void {
  void findRealtimeMeetingComments(roomId).then((comments) => {
    if (socket.connected && getSocketRoom(socket.id) === roomId) socket.emit("meeting-comments-sync", comments);
  }).catch(() => logger.warn("会议评论同步失败", { roomId, socketId: socket.id }));
}
