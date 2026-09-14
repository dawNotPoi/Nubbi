export const READ_TOOL_DESCRIPTIONS = {
  list: `List the authenticated user's visible Nubbi notes as paginated metadata.

Use this to browse, inspect hierarchy, or obtain note_id and updatedAt before another call. Filter by direct parent, source, lifecycle status, or exact tag. It reads both user- and agent-authored notes and never modifies them.

Args: limit 1-50, offset >=0, and optional parent_id/source/status/tag. Use parent_id="root" for root notes.
Returns structuredContent with the server page {items,total,count,offset,hasMore,nextOffset}; text gives a concise page summary.
Example: {"status":"inbox","source":"agent","limit":20,"offset":0}.
If hasMore is true, call again with nextOffset. On 401 replace the MCP token; on 429 wait and use smaller pages.`,

  search: `Search the authenticated user's note titles, Markdown bodies, and tags using literal text.

Use this when a note ID is unknown, then call nubbi_get_note for complete context. Optional source, status, and tag filters reduce results. This tool is read-only and may safely be retried after a transient network failure.

Args: query (1-500 chars), limit 1-50, offset >=0, optional source/status/tag.
Returns paginated matches with short snippets and paths in structuredContent.
Example: {"query":"launch retrospective","status":"archived","limit":10,"offset":0}.
Paginate with nextOffset; refine the query if output is clipped.`,

  get: `Read one visible Nubbi note, including metadata, ancestor path, content revision, and a bounded Markdown segment.

Use after list/search and before every edit. For long notes, continue with nextContentOffset until hasMoreContent is false. Set include_deleted only when inspecting an item already found in trash.

Args: note_id, include_deleted=false, content_offset>=0, content_limit 1-20000.
Returns note metadata plus content/contentRevision and segment pagination fields.
Example: {"note_id":"665c8d7e6f00112233445566","content_offset":0,"content_limit":20000}.
On 404 list/search again; do not guess IDs or revisions.`,

  trash: `List the authenticated user's soft-deleted Nubbi notes without restoring or permanently deleting anything.

Use this to find note_id and deletedAt before nubbi_restore_note. Results indicate source and whether MCP restoration is allowed; user-authored notes remain read-only.

Args: limit 1-50, offset >=0, and optional source.
Returns paginated trash items as structuredContent with a concise text summary.
Example: {"source":"agent","limit":20,"offset":0}.
Use nextOffset for later pages. Permanent deletion is intentionally unavailable through MCP.`,
} as const;
