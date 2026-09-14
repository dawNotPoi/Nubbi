export const SERVER_NAME = "nubbi-mcp-server";
export const SERVER_VERSION = "1.0.0";
export const CHARACTER_LIMIT = 25_000;
export const STRUCTURED_DATA_LIMIT = 20_000;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export const MAX_BATCH_SIZE = 20;
export const DEFAULT_CONTENT_LIMIT = 20_000;
export const MAX_CONTENT_LIMIT = 20_000;
export const API_TIMEOUT_MS = 30_000;
export const READ_RETRY_DELAY_MS = 150;

export const TOOL_NAMES = [
  "nubbi_list_notes",
  "nubbi_search_notes",
  "nubbi_get_note",
  "nubbi_get_notes",
  "nubbi_create_note",
  "nubbi_edit_note_content",
  "nubbi_update_note_properties",
  "nubbi_move_note",
  "nubbi_archive_note",
  "nubbi_trash_note",
  "nubbi_list_trash",
  "nubbi_restore_note",
] as const;
