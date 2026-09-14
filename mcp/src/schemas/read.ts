import * as z from "zod/v4";
import {
  DEFAULT_CONTENT_LIMIT,
  MAX_BATCH_SIZE,
  MAX_CONTENT_LIMIT,
} from "../constants.js";
import {
  LimitSchema,
  NoteIdSchema,
  OffsetSchema,
  SourceSchema,
  StatusSchema,
} from "./common.js";

const noteFilters = {
  source: SourceSchema.optional(),
  status: StatusSchema.optional(),
  tag: z.string().trim().min(1).max(100).optional().describe("Exact tag filter"),
};

export const ListTagsInputSchema = z.object({}).strict();

export const ListNotesInputSchema = z
  .object({
    limit: LimitSchema,
    offset: OffsetSchema,
    parent_id: z
      .union([NoteIdSchema, z.literal("root")])
      .optional()
      .describe("Only direct children of this note; use 'root' for root notes"),
    ...noteFilters,
  })
  .strict();

export const SearchNotesInputSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .describe("Literal text to search across titles, Markdown content, and tags"),
    limit: LimitSchema,
    offset: OffsetSchema,
    ...noteFilters,
  })
  .strict();

export const GetNoteInputSchema = z
  .object({
    note_id: NoteIdSchema,
    include_deleted: z
      .boolean()
      .default(false)
      .describe("Include a soft-deleted note; normally leave false"),
    content_offset: z
      .number()
      .int()
      .nonnegative()
      .default(0)
      .describe("Character offset for reading a later Markdown segment"),
    content_limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_CONTENT_LIMIT)
      .default(DEFAULT_CONTENT_LIMIT)
      .describe("Markdown characters to return, up to 20000"),
  })
  .strict();

/** 批量读取多篇笔记的输入 schema */
export const GetNotesInputSchema = z
  .object({
    note_ids: z
      .array(NoteIdSchema)
      .min(1)
      .max(MAX_BATCH_SIZE)
      .describe("Note IDs to read in one batch, up to 20"),
    content_limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_CONTENT_LIMIT)
      .default(DEFAULT_CONTENT_LIMIT)
      .describe("Markdown characters to return per note, up to 20000"),
  })
  .strict();

export const ListTrashInputSchema = z
  .object({
    limit: LimitSchema,
    offset: OffsetSchema,
    source: SourceSchema.optional(),
  })
  .strict();
