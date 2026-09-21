import { MCP_LIMITS } from "@/lib/mcpPolicy";
import { z } from "zod/v3";

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");

export const noteParamsSchema = z.object({ noteId: objectIdSchema }).strict();
const pageFields = {
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MCP_LIMITS.maxPageSize)
    .default(MCP_LIMITS.defaultPageSize),
  offset: z.coerce.number().int().nonnegative().default(0),
  source: z.enum(["user", "agent"]).optional(),
  status: z.enum(["inbox", "active", "archived"]).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
};

export const listNotesQuerySchema = z
  .object({
    ...pageFields,
    parentId: z
      .union([objectIdSchema, z.literal("root")])
      .transform((value) => (value === "root" ? null : value))
      .optional(),
  })
  .strict();

export const searchNotesQuerySchema = z
  .object({
    ...pageFields,
    query: z.string().trim().min(1).max(500),
  })
  .strict();

const queryBoolean = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

export const noteDetailQuerySchema = z
  .object({
    includeDeleted: queryBoolean.default("false"),
    contentOffset: z.coerce.number().int().nonnegative().default(0),
    contentLimit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MCP_LIMITS.contentChunkSize)
      .default(MCP_LIMITS.contentChunkSize),
  })
  .strict();

/** 批量读取笔记详情的请求体 schema */
export const batchNotesSchema = z
  .object({
    noteIds: z
      .array(objectIdSchema)
      .min(1)
      .max(MCP_LIMITS.maxBatchSize),
    contentLimit: z
      .number()
      .int()
      .min(1)
      .max(MCP_LIMITS.contentChunkSize)
      .default(MCP_LIMITS.contentChunkSize),
  })
  .strict();

export const trashQuerySchema = z
  .object({
    limit: pageFields.limit,
    offset: pageFields.offset,
    source: pageFields.source,
  })
  .strict();

const metaEntrySchema = z
  .object({ key: z.string().min(1), value: z.unknown(), type: z.string().default("text") })
  .strict();

export const createNoteSchema = z
  .object({
    title: z.string().max(500).optional(),
    content: z.string().optional(),
    parentId: objectIdSchema.nullable().optional(),
    author: z.string().max(200).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
    date: z.coerce.date().optional(),
    meta: z.union([z.array(metaEntrySchema), z.record(z.unknown())]).optional(),
  })
  .strict();

const revisionField = z.number().int().nonnegative();
export const contentEditSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("replace"),
    baseContentRevision: revisionField,
    content: z.string(),
  }).strict(),
  z.object({
    mode: z.literal("append"),
    baseContentRevision: revisionField,
    content: z.string(),
  }).strict(),
  z.object({
    mode: z.literal("prepend"),
    baseContentRevision: revisionField,
    content: z.string(),
  }).strict(),
  z.object({
    mode: z.literal("replace_text"),
    baseContentRevision: revisionField,
    oldText: z.string().min(1),
    newText: z.string(),
  }).strict(),
]);

export const propertiesSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime(),
    title: z.string().max(500).optional(),
    author: z.string().max(200).nullable().optional(),
    date: z.coerce.date().optional(),
    tagsAdd: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
    tagsRemove: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
    metaSet: z.record(z.unknown()).optional(),
    metaRemove: z.array(z.string().min(1).max(100)).max(100).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== "expectedUpdatedAt"), {
    message: "At least one property change is required",
  })
  .refine(
    (value) => {
      const removed = new Set(value.tagsRemove ?? []);
      return !(value.tagsAdd ?? []).some((tag) => removed.has(tag));
    },
    { message: "A tag cannot be added and removed together" },
  );

export const moveSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime(),
    parentId: objectIdSchema.nullable(),
  })
  .strict();

export const archiveSchema = z
  .object({ expectedUpdatedAt: z.string().datetime(), archived: z.boolean() })
  .strict();
export const trashSchema = z
  .object({ expectedUpdatedAt: z.string().datetime().optional() })
  .strict();
export const restoreSchema = z
  .object({ deletedAt: z.string().datetime().optional() })
  .strict();
