import type { Note, SearchNote } from "@/api/note";
import { getNoteTime } from "./hierarchy";

export type NoteTarget = Note | SearchNote;

export const buildTargetChildrenByParentId = (
  notes: Note[],
  blockedIds: Set<string>,
) => {
  const childMap = new Map<string, Note[]>();

  notes.forEach((note) => {
    const parentId = note.parentId ?? null;
    if (!parentId || blockedIds.has(note._id)) return;

    const children = childMap.get(parentId) ?? [];
    children.push(note);
    childMap.set(parentId, children);
  });

  childMap.forEach((children) => {
    children.sort((first, second) => getNoteTime(second) - getNoteTime(first));
  });

  return childMap;
};

export const getTopLevelTargetNotes = (
  targets: NoteTarget[],
  hierarchyNotes: Note[],
) => {
  const targetIds = new Set(targets.map((note) => note._id));
  const noteById = new Map(hierarchyNotes.map((note) => [note._id, note]));

  return targets.filter((note) => {
    let parentId = note.parentId ?? null;
    const visitedIds = new Set([note._id]);

    while (parentId) {
      if (targetIds.has(parentId)) return false;
      if (visitedIds.has(parentId)) return true;

      visitedIds.add(parentId);
      parentId = noteById.get(parentId)?.parentId ?? null;
    }

    return true;
  });
};
