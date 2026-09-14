export const NOTE_ACTIONS = [
  "read",
  "create",
  "update",
  "publish",
  "trash",
  "restore",
  "purge",
] as const;

export type NoteAction = (typeof NOTE_ACTIONS)[number];
