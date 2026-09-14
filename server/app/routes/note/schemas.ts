import { z } from "zod";

export const noteObjectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");

export const noteStatusSchema = z.enum(["inbox", "active", "archived"]);

export const noteMetaEntrySchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  type: z.string().default("text"),
});

// 在 HTTP 边界兼容旧版对象格式，并在 Controller 中统一规范化。
// 新调用方应优先使用数组格式。
export const noteMetaSchema = z.union([
  z.array(noteMetaEntrySchema),
  z.record(z.unknown()),
]);

export const createNoteBodySchema = z.object({
  _id: noteObjectIdSchema.optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  parentId: noteObjectIdSchema.nullable().optional(),
  source: z.enum(["user", "agent"]).optional(),
  author: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  cover: z.string().optional(),
  password: z.string().nullable().optional(),
  date: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  meta: noteMetaSchema.optional(),
});

export const updateNoteContentBodySchema = z.object({
  noteId: noteObjectIdSchema,
  content: z.string(),
  baseContentRevision: z.number().int().nonnegative().optional(),
  clientMutationId: z.string().optional(),
});

export const updateNotePropertiesBodySchema = z.object({
  noteId: noteObjectIdSchema,
  title: z.string().optional(),
  author: z.string().nullable().optional(),
  source: z.enum(["user", "agent"]).optional(),
  status: noteStatusSchema.optional(),
  published: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  parentId: noteObjectIdSchema.nullable().optional(),
  meta: noteMetaSchema.optional(),
  cover: z.string().optional(),
  password: z.string().nullable().optional(),
  date: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const publishNoteBodySchema = z.object({
  noteId: noteObjectIdSchema,
  published: z.boolean(),
});

export const noteIdBodySchema = z.object({
  noteId: noteObjectIdSchema,
});

export const noteIdQuerySchema = z.object({
  noteId: noteObjectIdSchema,
});

export const noteParentQuerySchema = z.object({
  parentId: noteObjectIdSchema,
});

export const searchNotesBodySchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export type CreateNoteBody = z.infer<typeof createNoteBodySchema>;
export type UpdateNoteContentBody = z.infer<
  typeof updateNoteContentBodySchema
>;
export type UpdateNotePropertiesBody = z.infer<
  typeof updateNotePropertiesBodySchema
>;
