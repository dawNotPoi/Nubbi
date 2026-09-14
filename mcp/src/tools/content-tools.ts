import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ToolOutputSchema } from "../schemas/common.js";
import {
  CreateNoteInputSchema,
  EditContentInputSchema,
  UpdatePropertiesInputSchema,
} from "../schemas/write.js";
import { summarizeMutation } from "../services/summaries.js";
import { runTool } from "../services/tool-runner.js";
import type { NubbiApi } from "../types.js";
import {
  CREATE_ANNOTATIONS,
  DESTRUCTIVE_ANNOTATIONS,
  UPDATE_ANNOTATIONS,
} from "./annotations.js";
import { WRITE_TOOL_DESCRIPTIONS } from "./write-descriptions.js";

export const registerContentTools = (server: McpServer, api: NubbiApi): void => {
  server.registerTool(
    "nubbi_create_note",
    {
      title: "Create Nubbi Note",
      description: WRITE_TOOL_DESCRIPTIONS.create,
      inputSchema: CreateNoteInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: CREATE_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Creating note",
        "POST",
        "/mcp-api/notes",
        {
          body: {
            title: input.title,
            content: input.content,
            parentId: input.parent_id,
            author: input.author,
            tags: input.tags,
            date: input.date,
            meta: input.meta,
          },
        },
        (data) => summarizeMutation("Created", data),
      ),
  );

  server.registerTool(
    "nubbi_edit_note_content",
    {
      title: "Edit Nubbi Note Content",
      description: WRITE_TOOL_DESCRIPTIONS.edit,
      inputSchema: EditContentInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Editing note content",
        "PATCH",
        `/mcp-api/notes/${input.note_id}/content`,
        {
          body: {
            mode: input.mode,
            baseContentRevision: input.base_content_revision,
            content: input.content,
            oldText: input.old_text,
            newText: input.new_text,
          },
        },
        (data) => summarizeMutation("Updated content for", data),
      ),
  );

  server.registerTool(
    "nubbi_update_note_properties",
    {
      title: "Update Nubbi Note Properties",
      description: WRITE_TOOL_DESCRIPTIONS.properties,
      inputSchema: UpdatePropertiesInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: UPDATE_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Updating note properties",
        "PATCH",
        `/mcp-api/notes/${input.note_id}/properties`,
        {
          body: {
            expectedUpdatedAt: input.expected_updated_at,
            title: input.title,
            author: input.author,
            date: input.date,
            tagsAdd: input.tags_add,
            tagsRemove: input.tags_remove,
            metaSet: input.meta_set,
            metaRemove: input.meta_remove,
          },
        },
        (data) => summarizeMutation("Updated properties for", data),
      ),
  );
};
