import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  GetNoteInputSchema,
  GetNotesInputSchema,
  ListNotesInputSchema,
  ListTrashInputSchema,
  SearchNotesInputSchema,
} from "../schemas/read.js";
import { ToolOutputSchema } from "../schemas/common.js";
import { summarizeBatchNotes, summarizeNote, summarizePage } from "../services/summaries.js";
import { runTool } from "./tool-runner.js";
import type { NubbiApi } from "../types.js";
import { READ_ANNOTATIONS } from "./annotations.js";
import { READ_TOOL_DESCRIPTIONS } from "./read-descriptions.js";

export const registerReadTools = (server: McpServer, api: NubbiApi): void => {
  server.registerTool(
    "nubbi_list_notes",
    {
      title: "List Nubbi Notes",
      description: READ_TOOL_DESCRIPTIONS.list,
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
      description: READ_TOOL_DESCRIPTIONS.search,
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
      description: READ_TOOL_DESCRIPTIONS.get,
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
      description: READ_TOOL_DESCRIPTIONS.getBatch,
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
      description: READ_TOOL_DESCRIPTIONS.trash,
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
