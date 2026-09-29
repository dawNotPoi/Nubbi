import * as z from "zod/v4";
import { IsoDateSchema, NoteIdSchema } from "./common.js";

/** `nubbi_move_note` 的输入契约，parent_id 为 null 表示移到根。 */
export const MoveNoteInputSchema = z
  .object({
    note_id: NoteIdSchema,
    expected_updated_at: IsoDateSchema,
    parent_id: NoteIdSchema.nullable().describe("New parent ID, or null to move to root"),
  })
  .strict();

/** `nubbi_archive_note` 的输入契约，用 archived 同时表达归档与取消归档。 */
export const ArchiveNoteInputSchema = z
  .object({
    note_id: NoteIdSchema,
    expected_updated_at: IsoDateSchema,
    archived: z.boolean().describe("True to archive; false to return the note to active status"),
  })
  .strict();

/** `nubbi_trash_note` 的输入契约。 */
export const TrashNoteInputSchema = z
  .object({
    note_id: NoteIdSchema,
    expected_updated_at: IsoDateSchema.optional(),
  })
  .strict();

/** `nubbi_restore_note` 的输入契约。 */
export const RestoreNoteInputSchema = z
  .object({
    note_id: NoteIdSchema,
    deleted_at: IsoDateSchema.optional().describe("Deletion timestamp read from nubbi_list_trash"),
  })
  .strict();
