import type { Note } from "@/api/note";

export const DEFAULT_NOTE_TITLE = "未命名文档";

export const normalizeNoteTitle = (title?: string) => {
  const value = title?.trim();
  return value || DEFAULT_NOTE_TITLE;
};

export const getNoteTime = (note: Note) => {
  const rawTime = note.updatedAt || note.createdAt;
  const time = rawTime ? new Date(rawTime).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

export const compareNoteTitle = (first: Note, second: Note) =>
  normalizeNoteTitle(first.title).localeCompare(
    normalizeNoteTitle(second.title),
    "zh-Hans-CN",
    {
      numeric: true,
      sensitivity: "base",
    },
  );

export const collectBlockedMoveTargetIds = (
  notes: Note[],
  allNotes: Note[] = [],
) => {
  const blockedIds = new Set<string>();
  const movingIds = new Set(notes.map((note) => note._id));
  const parentByNoteId = new Map(
    allNotes.map((note) => [note._id, note.parentId ?? null]),
  );

  notes.forEach((note) => blockedIds.add(note._id));
  allNotes.forEach((note) => {
    let parentId = note.parentId ?? null;
    const visitedIds = new Set<string>();

    while (parentId && !visitedIds.has(parentId)) {
      if (movingIds.has(parentId)) {
        blockedIds.add(note._id);
        break;
      }

      visitedIds.add(parentId);
      parentId = parentByNoteId.get(parentId) ?? null;
    }
  });

  return blockedIds;
};
