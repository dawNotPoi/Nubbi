import type { Server, Socket } from "socket.io";
import { registerMeetingLifecycleEvents } from "./lifecycle-events";
import { registerMeetingMembershipEvents } from "./membership-events";
import { registerPeerNegotiation } from "./peer-negotiation";

/** @param io 信令服务。@param socket 已认证连接。@returns 无；注册会议事件与媒体协商。 */
export function registerMeetingSocketHandlers(
  io: Server,
  socket: Socket,
): void {
  registerMeetingMembershipEvents(io, socket);
  registerPeerNegotiation(io, socket);
  registerMeetingLifecycleEvents(io, socket);
}

export default registerMeetingSocketHandlers;
