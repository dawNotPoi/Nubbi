import { z } from "zod";

const meetingIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId")
  .transform((value) => value.toLowerCase());

export const legacyMeetingPageSchema = z
  .object({
    page: z.coerce.number().int().safe().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
    _id: meetingIdSchema.optional(),
    hostId: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["unreviewd", "approved", "rejected"]).optional(),
    title: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .refine(
    ({ page, pageSize }) => (page - 1) * pageSize <= Number.MAX_SAFE_INTEGER,
    "Pagination offset is too large",
  );

export const vetMeetingSchema = z
  .object({
    id: meetingIdSchema,
    status: z.enum(["approved", "rejected"]),
  })
  .strict();

export type LegacyMeetingPageInput = z.infer<typeof legacyMeetingPageSchema>;
