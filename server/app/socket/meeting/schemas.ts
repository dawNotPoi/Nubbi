import { z } from "zod";

const meetingIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/)
  .transform((value) => value.toLowerCase());

export const roomMediaSchema = z
  .object({
    isVideoEnabled: z.boolean().optional(),
    isAudioEnabled: z.boolean().optional(),
    isScreenSharing: z.boolean().optional(),
  })
  .strict();

export const joinMeetingSchema = z
  .object({
    roomId: meetingIdSchema,
    accessToken: z.string().min(1).max(4096),
    clientSessionId: z.string().uuid(),
    media: roomMediaSchema.optional(),
  })
  .strict();

export const syncMeetingUserSchema = z
  .object({
    roomId: meetingIdSchema,
    media: roomMediaSchema,
  })
  .strict();

export const signalSchema = z
  .object({
    targetId: z.string().min(1).max(200),
    connectionId: z.string().uuid(),
    signal: z.union([
      z.object({ type: z.enum(["offer", "answer"]), sdp: z.string().max(100_000) }).strict(),
      z.object({ type: z.literal("candidate"), candidate: z.object({ candidate: z.string().max(4096), sdpMLineIndex: z.number().int().nullable(), sdpMid: z.string().nullable() }) }).strict(),
      z.object({ type: z.literal("renegotiate"), renegotiate: z.literal(true) }).strict(),
      z.object({ type: z.literal("transceiverRequest"), transceiverRequest: z.object({ kind: z.enum(["audio", "video"]), init: z.object({ direction: z.enum(["sendrecv", "sendonly", "recvonly", "inactive"]).optional() }).optional() }) }).strict(),
    ]),
  })
  .strict();

export const roomIdPayloadSchema = z
  .object({ roomId: meetingIdSchema })
  .strict();

export const meetingCommentSchema = z
  .object({
    roomId: meetingIdSchema,
    content: z.string().trim().min(1).max(2000),
  })
  .strict();

export type RoomMedia = z.infer<typeof roomMediaSchema>;
