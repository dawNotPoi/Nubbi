import {
  createRealtimeMeetingComment,
  endHostedMeeting,
  isMeetingHostedBy,
} from "@/controller/meeting/realtime";
import logger from "@/common/logger";
import { runAccountMutation } from "@/services/auth/account-mutation-guard";
import {
  beginMeetingClosures,
  cancelMeetingClosures,
} from "@/services/meeting/mutation-guard";
import { getSocketActor } from "@/socket/authentication";
import type { Server, Socket } from "socket.io";
import {
  endMeetingRoom,
  getSocketRoom,
} from "./room-state";
import {
  meetingCommentSchema,
  roomIdPayloadSchema,
} from "./schemas";
import type {
  MeetingActionResponse,
  MeetingCommentResponse,
} from "./types";
import { acknowledge } from "./acknowledgement";
import { ensureMeetingRoomActive } from "./room-access";

/** 注册会议生命周期相关的 Socket 事件（评论/结束会议） */
export function registerMeetingLifecycleEvents(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "sendMeetingComment",
    (
      payload: unknown,
      callback?: unknown,
    ) => {
      void (async () => {
        const actor = getSocketActor(socket);
        const parsed = meetingCommentSchema.safeParse(payload);
        if (!actor) {
          acknowledge<MeetingCommentResponse>(callback, {
            ok: false,
            reason: "UNAUTHORIZED",
          });
          return;
        }
        if (!parsed.success) {
          acknowledge<MeetingCommentResponse>(callback, {
            ok: false,
            reason: "INVALID_PAYLOAD",
          });
          return;
        }
        if (getSocketRoom(socket.id) !== parsed.data.roomId) {
          acknowledge<MeetingCommentResponse>(callback, {
            ok: false,
            reason: "NOT_IN_ROOM",
          });
          return;
        }
        if (!(await ensureMeetingRoomActive(io, parsed.data.roomId))) {
          acknowledge<MeetingCommentResponse>(callback, {
            ok: false,
            reason: "MEETING_UNAVAILABLE",
          });
          return;
        }

        const comment = await runAccountMutation(actor.id, () =>
          createRealtimeMeetingComment({
            meetingId: parsed.data.roomId,
            actor,
            content: parsed.data.content,
          }),
        );
        if (!comment) {
          acknowledge<MeetingCommentResponse>(callback, {
            ok: false,
            reason: "MEETING_UNAVAILABLE",
          });
          return;
        }

        io.to(parsed.data.roomId).emit(
          "meeting-comment-created",
          comment,
        );
        acknowledge<MeetingCommentResponse>(callback, {
          ok: true,
          comment,
        });
      })().catch((error: unknown) => {
        logger.error("创建会议评论失败", { socketId: socket.id, error });
        acknowledge<MeetingCommentResponse>(callback, {
          ok: false,
          reason: "CREATE_FAILED",
        });
      });
    },
  );

  socket.on(
    "endMeeting",
    (
      payload: unknown,
      callback?: unknown,
    ) => {
      void (async () => {
        const actor = getSocketActor(socket);
        const parsed = roomIdPayloadSchema.safeParse(payload);
        if (!actor) {
          acknowledge<MeetingActionResponse>(callback, {
            ok: false,
            reason: "UNAUTHORIZED",
          });
          return;
        }
        if (!parsed.success) {
          acknowledge<MeetingActionResponse>(callback, {
            ok: false,
            reason: "INVALID_PAYLOAD",
          });
          return;
        }
        if (getSocketRoom(socket.id) !== parsed.data.roomId) {
          acknowledge<MeetingActionResponse>(callback, {
            ok: false,
            reason: "NOT_IN_ROOM",
          });
          return;
        }
        await runAccountMutation(actor.id, async () => {
          const isHost = await isMeetingHostedBy({
            meetingId: parsed.data.roomId,
            hostId: actor.id,
          });
          if (!isHost) {
            acknowledge<MeetingActionResponse>(callback, {
              ok: false,
              reason: "FORBIDDEN",
            });
            return;
          }

          await beginMeetingClosures([parsed.data.roomId]);
          try {
            const ended = await endHostedMeeting({
              meetingId: parsed.data.roomId,
              hostId: actor.id,
            });
            if (!ended) {
              await ensureMeetingRoomActive(io, parsed.data.roomId);
              acknowledge<MeetingActionResponse>(callback, {
                ok: false,
                reason: "FORBIDDEN",
              });
              return;
            }

            await endMeetingRoom(io, parsed.data.roomId, actor.id);
            acknowledge<MeetingActionResponse>(callback, { ok: true });
          } finally {
            cancelMeetingClosures([parsed.data.roomId]);
          }
        });
      })().catch((error: unknown) => {
        logger.error("结束会议失败", { socketId: socket.id, error });
        acknowledge<MeetingActionResponse>(callback, {
          ok: false,
          reason: "END_FAILED",
        });
      });
    },
  );
}
