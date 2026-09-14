import type { Server, Socket } from "socket.io";
import { registerMeetingLifecycleEvents } from "./lifecycle-events";
import { registerMeetingMembershipEvents } from "./membership-events";

export function registerMeetingSocketHandlers(
  io: Server,
  socket: Socket,
): void {
  registerMeetingMembershipEvents(io, socket);
  registerMeetingLifecycleEvents(io, socket);
}

export default registerMeetingSocketHandlers;
