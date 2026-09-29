import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ToolOutputSchema } from "../schemas/common.js";
import {
  ArchiveNoteInputSchema,
  MoveNoteInputSchema,
  RestoreNoteInputSchema,
  TrashNoteInputSchema,
} from "../schemas/organization.js";
import { summarizeMutation } from "../services/summaries.js";
import { runTool } from "./tool-runner.js";
import type { NubbiApi } from "../types.js";
import {
  DESTRUCTIVE_ANNOTATIONS,
  UPDATE_ANNOTATIONS,
} from "./annotations.js";
import { WRITE_CONFIRMATION_GUIDANCE } from "../instructions.js";

// 以下文案会随 tools/list 原样发给模型，改动时需同时检查 token 预算与测试断言。
const MOVE_NOTE_DESCRIPTION = `${WRITE_CONFIRMATION_GUIDANCE}

Move an agent-authored note to another visible parent or to root. Preview the source and destination paths before confirmation.

Read the note first and pass expected_updated_at. parent_id=null means root. Nubbi rejects cycles and rejects moving a subtree containing user-authored descendants; no partial move occurs.

Returns the updated note/path. Example: {"note_id":"665c8d7e6f00112233445566","expected_updated_at":"2026-07-11T08:00:00Z","parent_id":null}.
On 409 re-read the source subtree and destination, then choose a valid target.`;
const ARCHIVE_NOTE_DESCRIPTION = `${WRITE_CONFIRMATION_GUIDANCE}

Archive or unarchive an agent-authored Nubbi note with optimistic concurrency. Preview the resulting lifecycle status before confirmation.

Read first and pass expected_updated_at. archived=true sets archived status; archived=false returns the note to active. This does not delete or publish the note.

Returns updated metadata. Example: {"note_id":"665c8d7e6f00112233445566","expected_updated_at":"2026-07-11T08:00:00Z","archived":true}.
On 409 re-read before retrying; user-authored notes are not writable.`;
const TRASH_NOTE_DESCRIPTION = `${WRITE_CONFIRMATION_GUIDANCE}

Move an agent-authored note and its pure-agent subtree to Nubbi trash. Preview every affected note when known before confirmation.

This is a destructive soft-delete, not permanent deletion. If any user-authored descendant would be affected, Nubbi returns 409 and changes nothing. Supply expected_updated_at when available from a fresh read.

Returns deletion metadata. Example: {"note_id":"665c8d7e6f00112233445566","expected_updated_at":"2026-07-11T08:00:00Z"}.
Use nubbi_list_trash and nubbi_restore_note to undo; permanent purge is intentionally unavailable.`;
const RESTORE_NOTE_DESCRIPTION = `${WRITE_CONFIRMATION_GUIDANCE}

Restore an agent-authored note and its eligible pure-agent descendants from trash. Preview the restored subtree and destination before confirmation.

First call nubbi_list_trash and pass the returned deletedAt when available. Restoration is rejected if a required parent remains in trash or a mixed-source subtree would be affected.

Returns restored note metadata. Example: {"note_id":"665c8d7e6f00112233445566","deleted_at":"2026-07-11T08:00:00Z"}.
On 409 refresh trash and restore the parent first. User-authored notes must be restored by the human UI.`;

export const registerOrganizationTools = (
  server: McpServer,
  api: NubbiApi,
): void => {
  server.registerTool(
    "nubbi_move_note",
    {
      title: "Move Nubbi Note",
      description: MOVE_NOTE_DESCRIPTION,
      inputSchema: MoveNoteInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: UPDATE_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Moving note",
        "POST",
        `/mcp-api/notes/${input.note_id}/move`,
        {
          body: {
            expectedUpdatedAt: input.expected_updated_at,
            parentId: input.parent_id,
          },
        },
        (data) => summarizeMutation("Moved", data),
      ),
  );

  server.registerTool(
    "nubbi_archive_note",
    {
      title: "Archive Nubbi Note",
      description: ARCHIVE_NOTE_DESCRIPTION,
      inputSchema: ArchiveNoteInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: UPDATE_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        input.archived ? "Archiving note" : "Unarchiving note",
        "POST",
        `/mcp-api/notes/${input.note_id}/archive`,
        {
          body: {
            expectedUpdatedAt: input.expected_updated_at,
            archived: input.archived,
          },
        },
        (data) => summarizeMutation(input.archived ? "Archived" : "Unarchived", data),
      ),
  );

  server.registerTool(
    "nubbi_trash_note",
    {
      title: "Trash Nubbi Note",
      description: TRASH_NOTE_DESCRIPTION,
      inputSchema: TrashNoteInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Trashing note",
        "POST",
        `/mcp-api/notes/${input.note_id}/trash`,
        { body: { expectedUpdatedAt: input.expected_updated_at } },
        (data) => summarizeMutation("Moved to trash", data),
      ),
  );

  server.registerTool(
    "nubbi_restore_note",
    {
      title: "Restore Nubbi Note",
      description: RESTORE_NOTE_DESCRIPTION,
      inputSchema: RestoreNoteInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: UPDATE_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Restoring note",
        "POST",
        `/mcp-api/notes/${input.note_id}/restore`,
        { body: { deletedAt: input.deleted_at } },
        (data) => summarizeMutation("Restored", data),
      ),
  );
};
