# Nubbi MCP Server

`nubbi-mcp-server` lets an MCP-compatible agent read and safely operate the authenticated user's Nubbi notes. It never connects to MongoDB: every operation goes through Nubbi Server's scoped `/mcp-api`.

## Permission boundary

Use a Nubbi **MCP Agent** token (`nb_...`), not a session cookie. The token may read all of its owner's notes, but may create and modify only notes whose `source` is `agent`.

- Allowed writes: create, content/property edit, move, archive, trash, and restore.
- New notes are always private `agent` notes with `status=inbox`.
- Not available: publishing, permanent deletion, files, meetings, or cross-user access.
- Moving/trashing/restoring a subtree with user-authored descendants is rejected before mutation; hierarchy writes are serialized per user.
- Content edits require `contentRevision`; other edits use `updatedAt` to prevent lost updates.

Create a separate token per deployment so it can be audited and revoked independently. Never put a token in prompts or tool arguments.

## Install and build

From the repository root:

```bash
pnpm install
pnpm --filter nubbi-mcp-server build
pnpm --filter nubbi-mcp-server test
```

Node.js 20 or newer is required. The package pins `@modelcontextprotocol/sdk` to `1.29.0` and uses Zod 4 strict schemas.

## Local stdio

Set the API URL and scoped key. Protocol messages use stdout; diagnostics use stderr only.

```bash
NUBBI_API_URL=http://localhost:4000 \
NUBBI_API_KEY=nb_replace_me \
node mcp/dist/stdio.js
```

Example MCP host configuration:

```json
{
  "mcpServers": {
    "nubbi": {
      "command": "node",
      "args": ["/absolute/path/to/Nubbi/mcp/dist/stdio.js"],
      "env": {
        "NUBBI_API_URL": "http://localhost:4000",
        "NUBBI_API_KEY": "nb_replace_me"
      }
    }
  }
}
```

Startup validates the token through `/mcp-api/context`; an invalid, expired, revoked, or incorrectly scoped key stops the process with a stderr error.

## Stateless Streamable HTTP

```bash
MCP_TRANSPORT=http \
NUBBI_API_URL=http://localhost:4000 \
MCP_HOST=0.0.0.0 \
MCP_PORT=3100 \
MCP_ALLOWED_HOSTS=localhost,127.0.0.1,mcp.example.com \
MCP_ALLOWED_ORIGINS=https://app.example.com \
node mcp/dist/http.js
```

- MCP endpoint: `POST /mcp`
- Health endpoint: `GET /health` (never returns token or user details)
- Authentication: `Authorization: Bearer nb_...`
- Responses: JSON-only, stateless Streamable HTTP; GET/SSE sessions are not enabled.
- `Host` and, when present, `Origin` must exactly match their allowlists.

For remote use, terminate TLS at a trusted reverse proxy and expose only HTTPS. Do not expose port 3100 directly to the public internet. `MCP_ALLOWED_ORIGINS` may be empty for non-browser clients that send no Origin header; wildcard origins are rejected.

Docker Compose builds this package from `mcp/Dockerfile`. Configure the public host and origin allowlists in the deployment environment.
Compose binds port 3100 to `127.0.0.1` by default for a host TLS reverse proxy. Set `MCP_BIND_ADDRESS` explicitly only when a different interface is intentional; never expose the plain HTTP port directly to the internet.

## Tools

| Tool | Purpose |
| --- | --- |
| `nubbi_list_notes` | Page through note metadata and filters |
| `nubbi_search_notes` | Literal search across title, Markdown, and tags |
| `nubbi_get_note` | Read metadata, ancestors, revision, and segmented Markdown |
| `nubbi_create_note` | Create a private agent inbox note |
| `nubbi_edit_note_content` | Replace, append, prepend, or uniquely replace text |
| `nubbi_update_note_properties` | Patch title, author, date, tags, and metadata |
| `nubbi_move_note` | Move an agent note or make it a root note |
| `nubbi_archive_note` | Archive or return an agent note to active |
| `nubbi_trash_note` | Soft-delete an eligible agent subtree |
| `nubbi_list_trash` | Page through soft-deleted notes |
| `nubbi_restore_note` | Restore an eligible agent subtree |

All tools return concise text plus `structuredContent`. List tools default to 20 and cap at 50 items. Note content is read in segments of at most 20,000 characters. Oversized structured responses are clipped with explicit pagination/filter guidance; tool text never exceeds 25,000 characters.

## Safe workflows

To append to a note:

1. Search or list to obtain `note_id`.
2. Read it with `nubbi_get_note`.
3. Call `nubbi_edit_note_content` with the returned `contentRevision`.
4. If the call returns 409, read again and deliberately reapply the change.

To reorganize a note, first read both the source and destination, then pass the source's `updatedAt` to `nubbi_move_note`. Use `parent_id: null` for the root.

To undo a soft deletion, list trash, copy the agent note's `deletedAt`, and restore the parent before any child. Permanent deletion remains a human-only UI action.

Writes are never automatically retried. Read-only calls retry once only for a short network/502/503/504 failure.

## Error handling

- `401`: replace the invalid, expired, or revoked token.
- `403`: use an MCP Agent token or choose an agent-authored note.
- `404`: list/search again; inaccessible and cross-user notes are intentionally indistinguishable.
- `409`: re-read the current revision/timestamp or resolve a mixed subtree/parent conflict.
- `429`: wait and reduce request rate or page size.

Tool failures use `isError: true`, retain safe conflict data when supplied by Nubbi, and include the next corrective action.

## Evaluations

`evaluations/fixture-notes.json` describes a stable historical fixture. Seed those notes into a dedicated test account while preserving IDs/relationships, then run the ten independent read-only questions in `evaluations/note-fixture-evaluations.xml` with an MCP evaluation harness. The evaluation file never requires write tools.
