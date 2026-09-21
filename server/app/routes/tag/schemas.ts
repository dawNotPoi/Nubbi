import { z } from "zod/v3";

export const tagNameBodySchema = z
  .object({
    name: z.string().trim().min(1).max(50),
  })
  .strict();

export type TagNameBody = z.infer<typeof tagNameBodySchema>;
