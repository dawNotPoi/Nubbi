import {
  authorizeMeetingJoin,
  findRealtimeMeetingComments,
} from "@/controller/meeting/realtime";
import logger from "@/common/logger";
import { runMeetingMutation } from "@/services/meeting/mutation-guard";
import { getSocketActor } from "@/socket/authentication";
import type { Server, Socket } from "socket.io";
import {
  areSocketsInSameRoom,
  getRoomUsers,
  getSocketRoom,
  leaveRoom,
  removeRoomUser,
  scheduleMeetingRoomExpiration,
  syncRoomUsers,
  upsertRoomUser,
} from "./room-state";
import {
  joinMeetingSchema,
  signalSchema,
  syncMeetingUserSchema,
} from "./schemas";
import type { JoinMeetingResponse } from "./types";
import { acknowledge } from "./acknowledgement";
import { ensureMeetingRoomActive } from "./room-access";

const failedJoin = (
  reason: Extract<JoinMeetingResponse, { ok: false }>["reason"],
): JoinMeetingResponse => ({
  ok: false,
  reason,
  existingPeers: [],
  roomUsers: [],
});

async function joinMeeting(
  io: Server,
  socket: Socket,
  payload: unknown,
): Promise<JoinMeetingResponse> {
  const actor = getSocketActor(socket);
  if (!actor) return failedJoin("UNAUTHORIZED");

  const parsed = joinMeetingSchema.safeParse(payload);
  if (!parsed.success) return failedJoin("INVALID_PAYLOAD");

  return runMeetingMutation(parsed.data.roomId, async () => {
    const access = await authorizeMeetingJoin({
      meetingId: parsed.data.roomId,
      userId: actor.id,
      accessToken: parsed.data.accessToken,
    });
    if (!access.ok) return failedJoin(access.reason);
    if (!getSocketActor(socket)) return failedJoin("UNAUTHORIZED");
    scheduleMeetingRoomExpiration(
      io,
      parsed.data.roomId,
      access.expiresAt,
    );

    const previousRoomId = getSocketRoom(socket.id);
    if (previousRoomId && previousRoomId !== parsed.data.roomId) {
      leaveRoom(io, socket, previousRoomId);
    }

    const existedInRoom =
      getRoomUsers(parsed.data.roomId).some(
        (roomUser) => roomUser.peerId === socket.id,
      );
    await socket.join(parsed.data.roomId);
    if (!socket.connected || !getSocketActor(socket)) {
      socket.leave(parsed.data.roomId);
      return failedJoin("UNAUTHORIZED");
    }
    const nextUser = upsertRoomUser({
      roomId: parsed.data.roomId,
      socketId: socket.id,
      actor,
      media: parsed.data.media,
    });
    const clients =
      io.sockets.adapter.rooms.get(parsed.data.roomId) ??
      new Set<string>();
    const existingPeers = Array.from(clients).filter(
      (socketId) => socketId !== socket.id,
    );

    if (!existedInRoom) {
      socket.to(parsed.data.roomId).emit("handlerNewUser", nextUser);
    }
    syncRoomUsers(io, parsed.data.roomId);

    const comments = await findRealtimeMeetingComments(
      parsed.data.roomId,
    ).catch((error: unknown) => {
      logger.warn("会议评论同步失败，可在入会后重试", {
        roomId: parsed.data.roomId,
        socketId: socket.id,
        error,
      });
      return null;
    });
    if (comments) socket.emit("meeting-comments-sync", comments);
    return {
      ok: true,
      existingPeers,
      roomUsers: getRoomUsers(parsed.data.roomId),
    };
  });
}

export function registerMeetingMembershipEvents(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "joinMeetingRoom",
    (
      payload: unknown,
      callback?: unknown,
    ) => {
      void joinMeeting(io, socket, payload)
        .then((response) => acknowledge(callback, response))
        .catch((error: unknown) => {
          logger.error("加入会议房间失败", { socketId: socket.id, error });
          acknowledge(callback, failedJoin("JOIN_FAILED"));
        });
    },
  );

  socket.on("syncMeetingUser", (payload: unknown) => {
    void (async () => {
      const actor = getSocketActor(socket);
      const parsed = syncMeetingUserSchema.safeParse(payload);
      if (!actor || !parsed.success) return;
      if (getSocketRoom(socket.id) !== parsed.data.roomId) return;
      if (!(await ensureMeetingRoomActive(io, parsed.data.roomId))) return;
      if (!socket.connected || !getSocketActor(socket)) return;
      if (getSocketRoom(socket.id) !== parsed.data.roomId) return;

      upsertRoomUser({
        roomId: parsed.data.roomId,
        socketId: socket.id,
        actor,
        media: parsed.data.media,
      });
      syncRoomUsers(io, parsed.data.roomId);
    })().catch((error: unknown) => {
      logger.error("会议成员状态同步失败", { socketId: socket.id, error });
    });
  });

  socket.on("signal", (payload: unknown) => {
    void (async () => {
      if (!getSocketActor(socket)) return;
      const parsed = signalSchema.safeParse(payload);
      if (!parsed.success) return;
      const roomId = getSocketRoom(socket.id);
      if (!roomId) return;
      if (!areSocketsInSameRoom(socket.id, parsed.data.targetId)) return;
      if (!(await ensureMeetingRoomActive(io, roomId))) return;
      if (!socket.connected || !getSocketActor(socket)) return;
      if (!areSocketsInSameRoom(socket.id, parsed.data.targetId)) return;

      io.to(parsed.data.targetId).emit("signal", {
        senderId: socket.id,
        signal: parsed.data.signal,
      });
    })().catch((error: unknown) => {
      logger.error("会议信令转发失败", { socketId: socket.id, error });
    });
  });

  socket.on("disconnect", () => {
    const roomId = removeRoomUser(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit("user-left", socket.id);
    syncRoomUsers(io, roomId);
  });
}
