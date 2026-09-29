import * as z from "zod/v4";
import { IsoDateSchema, JsonValueSchema, NoteIdSchema } from "./common.js";

const titleSchema = z.string().trim().min(1).max(500);
const tagSchema = z.string().trim().min(1).max(100);
const metadataSchema = z.record(z.string().trim().min(1).max(100), JsonValueSchema);

/** `nubbi_create_note` 的输入契约。 */
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

/** `nubbi_edit_note_content` 的输入契约，约束四种编辑模式各自允许的字段组合。 */
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

/** `nubbi_update_note_properties` 的输入契约，至少要求一项属性变更。 */
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
