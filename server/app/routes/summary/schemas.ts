import { z } from "zod/v3";

const noteIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");

export const createSummaryBodySchema = z
  .object({
    content: z.string(),
    noteId: noteIdSchema,
  })
  .strict();

export const findSummaryBodySchema = z
  .object({
    noteId: noteIdSchema,
  })
  .strict();

export type CreateSummaryBody = z.infer<typeof createSummaryBodySchema>;
export type FindSummaryBody = z.infer<typeof findSummaryBodySchema>;
