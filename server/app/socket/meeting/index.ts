import type { Server, Socket } from "socket.io";
import { registerMeetingLifecycleEvents } from "./lifecycle-events";
import { registerMeetingMembershipEvents } from "./membership-events";

/** 注册会议相关的全部 Socket 事件处理器 */
export function registerMeetingSocketHandlers(
  io: Server,
  socket: Socket,
): void {
  registerMeetingMembershipEvents(io, socket);
  registerMeetingLifecycleEvents(io, socket);
}

export default registerMeetingSocketHandlers;
