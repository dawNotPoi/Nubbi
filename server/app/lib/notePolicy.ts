/** 笔记权限动作清单：read 为读，其余为各类写操作 */
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
