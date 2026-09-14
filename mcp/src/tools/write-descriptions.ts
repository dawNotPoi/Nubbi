const WRITE_CONFIRMATION_GUIDANCE = `Before calling this write tool, discuss the intended change, show a concise preview, and wait for explicit confirmation in a later user message. A title, path, topic, or high-level intent alone is not permission to invent content. Skip confirmation only when the user explicitly requests immediate execution or says no confirmation is needed.`;

export const WRITE_TOOL_DESCRIPTIONS = {
  create: `${WRITE_CONFIRMATION_GUIDANCE}

Create a private agent-authored Nubbi note. If the user has not supplied or approved the full body, do not generate substantial content; preview an empty or proposed body and wait.

The Nubbi server always forces source=agent, status=inbox, and published=false. The note may be placed at root or under any visible, non-deleted parent. This tool never publishes content.

Args: optional title, Markdown content, parent_id/null, author/null, tags, ISO date, and JSON-compatible meta.
Returns the created note, including note ID, content revision, and updated timestamp.
Example: {"title":"Research draft","content":"# Findings","tags":["research"]}.
On 404 re-read the parent; on 403 create a properly scoped MCP Agent token.`,

  edit: `${WRITE_CONFIRMATION_GUIDANCE}

Safely edit Markdown in an agent-authored note using optimistic concurrency. Preview the exact replacement, appended content, or text substitution before confirmation.

Read the note first and pass its exact contentRevision as base_content_revision. Modes replace, append, and prepend require content. replace_text requires a unique non-empty old_text plus new_text and fails rather than editing an ambiguous match. User-authored notes cannot be changed.

Returns the updated note and new content revision. Example: {"note_id":"665c8d7e6f00112233445566","mode":"append","base_content_revision":3,"content":"\n## Next steps"}.
On 409 re-read and intentionally reapply the edit; write calls are never auto-retried.`,

  properties: `${WRITE_CONFIRMATION_GUIDANCE}

Partially update safe properties of an agent-authored Nubbi note. Preview every property and tag change before confirmation.

Read the note first and pass its exact updatedAt as expected_updated_at. Supports title, author, date, tag additions/removals, metadata set/removal. It cannot change source, publish state, deletion state, parent, or lifecycle status.

At least one change is required. Example: {"note_id":"665c8d7e6f00112233445566","expected_updated_at":"2026-07-11T08:00:00Z","tags_add":["reviewed"]}.
On 409 re-read and merge deliberately; on 403 choose an agent-authored note.`,

  move: `${WRITE_CONFIRMATION_GUIDANCE}

Move an agent-authored note to another visible parent or to root. Preview the source and destination paths before confirmation.

Read the note first and pass expected_updated_at. parent_id=null means root. Nubbi rejects cycles and rejects moving a subtree containing user-authored descendants; no partial move occurs.

Returns the updated note/path. Example: {"note_id":"665c8d7e6f00112233445566","expected_updated_at":"2026-07-11T08:00:00Z","parent_id":null}.
On 409 re-read the source subtree and destination, then choose a valid target.`,

  archive: `${WRITE_CONFIRMATION_GUIDANCE}

Archive or unarchive an agent-authored Nubbi note with optimistic concurrency. Preview the resulting lifecycle status before confirmation.

Read first and pass expected_updated_at. archived=true sets archived status; archived=false returns the note to active. This does not delete or publish the note.

Returns updated metadata. Example: {"note_id":"665c8d7e6f00112233445566","expected_updated_at":"2026-07-11T08:00:00Z","archived":true}.
On 409 re-read before retrying; user-authored notes are not writable.`,

  trash: `${WRITE_CONFIRMATION_GUIDANCE}

Move an agent-authored note and its pure-agent subtree to Nubbi trash. Preview every affected note when known before confirmation.

This is a destructive soft-delete, not permanent deletion. If any user-authored descendant would be affected, Nubbi returns 409 and changes nothing. Supply expected_updated_at when available from a fresh read.

Returns deletion metadata. Example: {"note_id":"665c8d7e6f00112233445566","expected_updated_at":"2026-07-11T08:00:00Z"}.
Use nubbi_list_trash and nubbi_restore_note to undo; permanent purge is intentionally unavailable.`,

  restore: `${WRITE_CONFIRMATION_GUIDANCE}

Restore an agent-authored note and its eligible pure-agent descendants from trash. Preview the restored subtree and destination before confirmation.

First call nubbi_list_trash and pass the returned deletedAt when available. Restoration is rejected if a required parent remains in trash or a mixed-source subtree would be affected.

Returns restored note metadata. Example: {"note_id":"665c8d7e6f00112233445566","deleted_at":"2026-07-11T08:00:00Z"}.
On 409 refresh trash and restore the parent first. User-authored notes must be restored by the human UI.`,
} as const;
