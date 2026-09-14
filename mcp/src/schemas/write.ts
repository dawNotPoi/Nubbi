import * as z from "zod/v4";
import { IsoDateSchema, JsonValueSchema, NoteIdSchema } from "./common.js";

const titleSchema = z.string().trim().min(1).max(500);
const tagSchema = z.string().trim().min(1).max(100);
const metadataSchema = z.record(z.string().trim().min(1).max(100), JsonValueSchema);

export const CreateNoteInputSchema = z
  .object({
    title: titleSchema.optional().describe("Note title; defaults to the Nubbi server value"),
    content: z.string().max(2_000_000).optional().describe("Markdown body"),
    parent_id: NoteIdSchema.nullable().optional().describe("Parent note ID, or null for root"),
    author: z.string().trim().max(200).nullable().optional(),
    tags: z.array(tagSchema).max(100).optional(),
    date: IsoDateSchema.optional(),
    meta: metadataSchema.optional().describe("Custom JSON-compatible metadata by key"),
  })
  .strict();

export const EditContentInputSchema = z
  .object({
    note_id: NoteIdSchema,
    mode: z.enum(["replace", "append", "prepend", "replace_text"]),
    base_content_revision: z.number().int().nonnegative(),
    content: z.string().max(2_000_000).optional(),
    old_text: z.string().min(1).max(200_000).optional(),
    new_text: z.string().max(2_000_000).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.mode === "replace_text") {
      if (input.old_text === undefined || input.new_text === undefined) {
        context.addIssue({
          code: "custom",
          message: "replace_text requires old_text and new_text",
          path: ["old_text"],
        });
      }
      if (input.content !== undefined) {
        context.addIssue({
          code: "custom",
          message: "replace_text does not accept content",
          path: ["content"],
        });
      }
    } else if (input.content === undefined) {
      context.addIssue({
        code: "custom",
        message: `${input.mode} requires content`,
        path: ["content"],
      });
    } else if (input.old_text !== undefined || input.new_text !== undefined) {
      context.addIssue({
        code: "custom",
        message: `${input.mode} does not accept old_text or new_text`,
        path: ["old_text"],
      });
    }
  });

export const UpdatePropertiesInputSchema = z
  .object({
    note_id: NoteIdSchema,
    expected_updated_at: IsoDateSchema,
    title: titleSchema.optional(),
    author: z.string().trim().max(200).nullable().optional(),
    date: IsoDateSchema.optional(),
    tags_add: z.array(tagSchema).max(100).optional(),
    tags_remove: z.array(tagSchema).max(100).optional(),
    meta_set: metadataSchema.optional(),
    meta_remove: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const changes = [
      input.title,
      input.author,
      input.date,
      input.tags_add,
      input.tags_remove,
      input.meta_set,
      input.meta_remove,
    ];
    if (changes.every((value) => value === undefined)) {
      context.addIssue({ code: "custom", message: "Provide at least one property change" });
    }
    const removed = new Set(input.tags_remove ?? []);
    if ((input.tags_add ?? []).some((tag) => removed.has(tag))) {
      context.addIssue({ code: "custom", message: "A tag cannot be added and removed together" });
    }
  });

export const MoveNoteInputSchema = z
  .object({
    note_id: NoteIdSchema,
    expected_updated_at: IsoDateSchema,
    parent_id: NoteIdSchema.nullable().describe("New parent ID, or null to move to root"),
  })
  .strict();

export const ArchiveNoteInputSchema = z
  .object({
    note_id: NoteIdSchema,
    expected_updated_at: IsoDateSchema,
    archived: z.boolean().describe("True to archive; false to return the note to active status"),
  })
  .strict();

export const TrashNoteInputSchema = z
  .object({
    note_id: NoteIdSchema,
    expected_updated_at: IsoDateSchema.optional(),
  })
  .strict();

export const RestoreNoteInputSchema = z
  .object({
    note_id: NoteIdSchema,
    deleted_at: IsoDateSchema.optional().describe("Deletion timestamp read from nubbi_list_trash"),
  })
  .strict();
