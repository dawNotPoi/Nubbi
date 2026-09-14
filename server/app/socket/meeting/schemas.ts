import { z } from "zod";

const meetingIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/)
  .transform((value) => value.toLowerCase());

export const roomMediaSchema = z
  .object({
    isVideoEnabled: z.boolean().optional(),
    isAudioEnabled: z.boolean().optional(),
  })
  .strict();

export const joinMeetingSchema = z
  .object({
    roomId: meetingIdSchema,
    accessToken: z.string().min(1).max(4096),
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
    signal: z.custom<unknown>((value) => value !== undefined),
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
