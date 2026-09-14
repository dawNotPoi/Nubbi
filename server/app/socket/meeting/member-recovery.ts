import type { Server, Socket } from "socket.io";
import { getSocketRoom, removeRoomUser, syncRoomUsers } from "./room-state";

/** 短暂信令掉线的宽限，不能用于无限期保留已失去授权的成员。 */
export const MEETING_RECOVERY_WINDOW_MS = 15_000;
const pendingDepartures = new Map<string, ReturnType<typeof setTimeout>>();

/** @param socketId 已重新认证的连接身份。@returns 无；取消尚未执行的离会。 */
export function cancelMemberDeparture(socketId: string): void {
  clearTimeout(pendingDepartures.get(socketId));
  pendingDepartures.delete(socketId);
}

/** @param io 信令服务。@param socket 断开的连接。@param reason Socket.IO 断开原因。@returns 无；主动断开立即离会。 */
export function scheduleMemberDeparture(io: Server, socket: Socket, reason: string): void {
  cancelMemberDeparture(socket.id);
  const roomId = getSocketRoom(socket.id);
  if (!roomId) return;
  const depart = (): void => {
    pendingDepartures.delete(socket.id);
    if (getSocketRoom(socket.id) !== roomId) return;
    // 恢复传输但未重新通过入会校验的连接，不能继续留在 Socket.IO 广播房间。
    io.sockets.sockets.get(socket.id)?.leave(roomId);
    removeRoomUser(socket.id);
    io.to(roomId).emit("user-left", socket.id);
    syncRoomUsers(io, roomId);
  };
  if (!["transport close", "transport error", "ping timeout"].includes(reason)) { depart(); return; }
  const timer = setTimeout(depart, MEETING_RECOVERY_WINDOW_MS);
  timer.unref();
  pendingDepartures.set(socket.id, timer);
}
