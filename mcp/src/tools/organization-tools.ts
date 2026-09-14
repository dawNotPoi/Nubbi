import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ToolOutputSchema } from "../schemas/common.js";
import {
  ArchiveNoteInputSchema,
  MoveNoteInputSchema,
  RestoreNoteInputSchema,
  TrashNoteInputSchema,
} from "../schemas/write.js";
import { summarizeMutation } from "../services/summaries.js";
import { runTool } from "./tool-runner.js";
import type { NubbiApi } from "../types.js";
import {
  DESTRUCTIVE_ANNOTATIONS,
  UPDATE_ANNOTATIONS,
} from "./annotations.js";
import { WRITE_TOOL_DESCRIPTIONS } from "./write-descriptions.js";

export const registerOrganizationTools = (
  server: McpServer,
  api: NubbiApi,
): void => {
  server.registerTool(
    "nubbi_move_note",
    {
      title: "Move Nubbi Note",
      description: WRITE_TOOL_DESCRIPTIONS.move,
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
      description: WRITE_TOOL_DESCRIPTIONS.archive,
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
      description: WRITE_TOOL_DESCRIPTIONS.trash,
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
      description: WRITE_TOOL_DESCRIPTIONS.restore,
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
