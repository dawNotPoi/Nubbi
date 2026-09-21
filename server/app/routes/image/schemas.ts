import { z } from "zod/v3";

export const imageIdQuerySchema = z
  .object({
    id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId"),
  })
  .strict();

export const createImageBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    content: z.string().min(1),
    type: z.string().trim().max(100).optional(),
  })
  .strict();

export type CreateImageBody = z.infer<typeof createImageBodySchema>;
