import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ToolOutputSchema } from "../schemas/common.js";
import {
  CreateNoteInputSchema,
  EditContentInputSchema,
  UpdatePropertiesInputSchema,
} from "../schemas/content.js";
import { summarizeMutation } from "../services/summaries.js";
import { runTool } from "./tool-runner.js";
import type { NubbiApi } from "../types.js";
import {
  CREATE_ANNOTATIONS,
  DESTRUCTIVE_ANNOTATIONS,
  UPDATE_ANNOTATIONS,
} from "./annotations.js";
import { WRITE_CONFIRMATION_GUIDANCE } from "../instructions.js";

// 以下文案会随 tools/list 原样发给模型，改动时需同时检查 token 预算与测试断言。
const CREATE_NOTE_DESCRIPTION = `${WRITE_CONFIRMATION_GUIDANCE}

Create a private agent-authored Nubbi note. If the user has not supplied or approved the full body, do not generate substantial content; preview an empty or proposed body and wait.

When tags are appropriate, call nubbi_list_tags before the proposal. Reuse semantically matching tag names exactly, including spelling and letter case. Propose a new tag only when none fits, and identify reused versus new tags in the preview.

The Nubbi server always forces source=agent, status=inbox, and published=false. The note may be placed at root or under any visible, non-deleted parent. This tool never publishes content.

Args: optional title, Markdown content, parent_id/null, author/null, tags, ISO date, and JSON-compatible meta.
Returns the created note, including note ID, content revision, and updated timestamp.
Example: {"title":"Research draft","content":"# Findings","tags":["research"]}.
On 404 re-read the parent; on 403 create a properly scoped MCP Agent token.`;
const EDIT_NOTE_CONTENT_DESCRIPTION = `${WRITE_CONFIRMATION_GUIDANCE}

Safely edit Markdown in an agent-authored note using optimistic concurrency. Preview the exact replacement, appended content, or text substitution before confirmation.

Read the note first and pass its exact contentRevision as base_content_revision. Modes replace, append, and prepend require content. replace_text requires a unique non-empty old_text plus new_text and fails rather than editing an ambiguous match. User-authored notes cannot be changed.

Returns the updated note and new content revision. Example: {"note_id":"665c8d7e6f00112233445566","mode":"append","base_content_revision":3,"content":"
## Next steps"}.
On 409 re-read and intentionally reapply the edit; write calls are never auto-retried.`;
const UPDATE_NOTE_PROPERTIES_DESCRIPTION = `${WRITE_CONFIRMATION_GUIDANCE}

Partially update safe properties of an agent-authored Nubbi note. Preview every property and tag change before confirmation.

Before adding tags, call nubbi_list_tags and prefer exact existing names for matching concepts. Clearly identify any genuinely new tag in the preview.

Read the note first and pass its exact updatedAt as expected_updated_at. Supports title, author, date, tag additions/removals, metadata set/removal. It cannot change source, publish state, deletion state, parent, or lifecycle status.

At least one change is required. Example: {"note_id":"665c8d7e6f00112233445566","expected_updated_at":"2026-07-11T08:00:00Z","tags_add":["reviewed"]}.
On 409 re-read and merge deliberately; on 403 choose an agent-authored note.`;

export const registerContentTools = (server: McpServer, api: NubbiApi): void => {
  server.registerTool(
    "nubbi_create_note",
    {
      title: "Create Nubbi Note",
      description: CREATE_NOTE_DESCRIPTION,
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
      description: EDIT_NOTE_CONTENT_DESCRIPTION,
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
      description: UPDATE_NOTE_PROPERTIES_DESCRIPTION,
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
