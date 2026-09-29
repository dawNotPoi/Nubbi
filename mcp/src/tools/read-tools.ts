import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  GetNoteInputSchema,
  GetNotesInputSchema,
  ListTagsInputSchema,
  ListNotesInputSchema,
  ListTrashInputSchema,
  SearchNotesInputSchema,
} from "../schemas/read.js";
import { ToolOutputSchema } from "../schemas/common.js";
import {
  summarizeBatchNotes,
  summarizeNote,
  summarizePage,
  summarizeTags,
} from "../services/summaries.js";
import { runTool } from "./tool-runner.js";
import type { NubbiApi } from "../types.js";
import { READ_ANNOTATIONS } from "./annotations.js";

// 以下文案会随 tools/list 原样发给模型，改动时需同时检查 token 预算与测试断言。
const LIST_TAGS_DESCRIPTION = `List one page of existing tags in the authenticated user's Nubbi tag catalog. Use limit and offset; follow nextOffset while hasMore is true.

Call this before proposing a tagged note or tag-property update. Reuse an existing tag exactly, including spelling and letter case, when it already represents the intended concept. Propose a new tag only when no existing tag fits. This tool is read-only.

Args: none.
Returns the alphabetically sorted tag names in structuredContent and a concise count in text.
Example: {}.
An empty list means no existing tags are available to reuse.`;
const LIST_NOTES_DESCRIPTION = `List the authenticated user's visible Nubbi notes as paginated metadata.

Use this to browse, inspect hierarchy, or obtain note_id and updatedAt before another call. Filter by direct parent, source, lifecycle status, or exact tag. It reads both user- and agent-authored notes and never modifies them.

Args: limit 1-50, offset >=0, and optional parent_id/source/status/tag. Use parent_id="root" for root notes.
Returns structuredContent with the server page {items,total,count,offset,hasMore,nextOffset}; text gives a concise page summary.
Example: {"status":"inbox","source":"agent","limit":20,"offset":0}.
If hasMore is true, call again with nextOffset. On 401 replace the MCP token; on 429 wait and use smaller pages.`;
const SEARCH_NOTES_DESCRIPTION = `Search the authenticated user's note titles, Markdown bodies, and tags using literal text.

Use this when a note ID is unknown, then call nubbi_get_note for complete context. Optional source, status, and tag filters reduce results. This tool is read-only and may safely be retried after a transient network failure.

Args: query (1-500 chars), limit 1-50, offset >=0, optional source/status/tag.
Returns paginated matches with short snippets and paths in structuredContent.
Example: {"query":"launch retrospective","status":"archived","limit":10,"offset":0}.
Paginate with nextOffset; refine the query if output is clipped.`;
const GET_NOTE_DESCRIPTION = `Read one visible Nubbi note, including metadata, ancestor path, content revision, and a bounded Markdown segment.

Use after list/search and before every edit. For long notes, continue with nextContentOffset until hasMoreContent is false. Set include_deleted only when inspecting an item already found in trash.

Args: note_id, include_deleted=false, content_offset>=0, content_limit 1-20000.
Returns note metadata plus content/contentRevision and segment pagination fields.
Example: {"note_id":"665c8d7e6f00112233445566","content_offset":0,"content_limit":20000}.
On 404 list/search again; do not guess IDs or revisions.`;
const GET_NOTES_DESCRIPTION = `Read multiple visible Nubbi notes in one batch, each with metadata, ancestor path, content revision, and a bounded Markdown segment.

Prefer this over repeated nubbi_get_note calls when you already know several note_ids from list/search and need their contents together. Missing or inaccessible IDs are reported separately.

Args: note_ids (1-20), content_limit 1-20000.
Returns structuredContent with {items:[...], missingIds:[...]}; each item has content/contentRevision and segment pagination fields.
Example: {"note_ids":["665c8d7e6f00112233445566","665c8d7e6f00112233445577"],"content_limit":20000}.
For longer notes use nubbi_get_note with content_offset to read later segments.`;
const LIST_TRASH_DESCRIPTION = `List the authenticated user's soft-deleted Nubbi notes without restoring or permanently deleting anything.

Use this to find note_id and deletedAt before nubbi_restore_note. Results indicate source and whether MCP restoration is allowed; user-authored notes remain read-only.

Args: limit 1-50, offset >=0, and optional source.
Returns paginated trash items as structuredContent with a concise text summary.
Example: {"source":"agent","limit":20,"offset":0}.
Use nextOffset for later pages. Permanent deletion is intentionally unavailable through MCP.`;

export const registerReadTools = (server: McpServer, api: NubbiApi): void => {
  server.registerTool(
    "nubbi_list_tags",
    {
      title: "List Nubbi Tags",
      description: LIST_TAGS_DESCRIPTION,
      inputSchema: ListTagsInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: READ_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Listing tags",
        "GET",
        "/mcp-api/tags",
        { query: { limit: input.limit, offset: input.offset }, retryRead: true },
        summarizeTags,
      ),
  );

  server.registerTool(
    "nubbi_list_notes",
    {
      title: "List Nubbi Notes",
      description: LIST_NOTES_DESCRIPTION,
      inputSchema: ListNotesInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: READ_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Listing notes",
        "GET",
        "/mcp-api/notes",
        {
          query: {
            limit: input.limit,
            offset: input.offset,
            parentId: input.parent_id,
            source: input.source,
            status: input.status,
            tag: input.tag,
          },
          retryRead: true,
        },
        (data) => summarizePage("notes", data),
      ),
  );

  server.registerTool(
    "nubbi_search_notes",
    {
      title: "Search Nubbi Notes",
      description: SEARCH_NOTES_DESCRIPTION,
      inputSchema: SearchNotesInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: READ_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Searching notes",
        "GET",
        "/mcp-api/notes/search",
        {
          query: {
            query: input.query,
            limit: input.limit,
            offset: input.offset,
            source: input.source,
            status: input.status,
            tag: input.tag,
          },
          retryRead: true,
        },
        (data) => summarizePage("matching notes", data),
      ),
  );

  server.registerTool(
    "nubbi_get_note",
    {
      title: "Read Nubbi Note",
      description: GET_NOTE_DESCRIPTION,
      inputSchema: GetNoteInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: READ_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Reading note",
        "GET",
        `/mcp-api/notes/${input.note_id}`,
        {
          query: {
            includeDeleted: input.include_deleted,
            contentOffset: input.content_offset,
            contentLimit: input.content_limit,
          },
          retryRead: true,
        },
        summarizeNote,
      ),
  );

  server.registerTool(
    "nubbi_get_notes",
    {
      title: "Read Multiple Nubbi Notes",
      description: GET_NOTES_DESCRIPTION,
      inputSchema: GetNotesInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: READ_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Reading notes in batch",
        "POST",
        "/mcp-api/notes/batch",
        {
          body: {
            noteIds: input.note_ids,
            contentLimit: input.content_limit,
          },
          retryRead: true,
        },
        summarizeBatchNotes,
      ),
  );

  server.registerTool(
    "nubbi_list_trash",
    {
      title: "List Nubbi Trash",
      description: LIST_TRASH_DESCRIPTION,
      inputSchema: ListTrashInputSchema,
      outputSchema: ToolOutputSchema,
      annotations: READ_ANNOTATIONS,
    },
    async (input): Promise<CallToolResult> =>
      runTool(
        api,
        "Listing trash",
        "GET",
        "/mcp-api/trash",
        {
          query: {
            limit: input.limit,
            offset: input.offset,
            source: input.source,
          },
          retryRead: true,
        },
        (data) => summarizePage("trashed notes", data),
      ),
  );
};
