import type { Note } from "@/api/note";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";
import { compareNoteTitle, getNoteTime, normalizeNoteTitle } from "./hierarchy";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

export type NoteLibrarySortMode =
  | "name-asc"
  | "name-desc"
  | "updated-desc"
  | "updated-asc";

export type NoteLibraryViewMode = "tree" | "search";

export type NoteLibraryRow = {
  note: Note;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  pathLabel?: string;
  matched: boolean;
};

type NoteLibraryRowsOptions = {
  expandedIds: string[];
  filterText: string;
  notes: Note[];
  sortMode: NoteLibrarySortMode;
};

type NoteLibraryIndex = {
  childrenByParentId: Map<string | null, Note[]>;
  noteById: Map<string, Note>;
  roots: Note[];
};

export const sortLibraryNotes = (
  notes: Note[],
  sortMode: NoteLibrarySortMode,
) => {
  return [...notes].sort((first, second) => {
    if (sortMode === "name-asc") return compareNoteTitle(first, second);
    if (sortMode === "name-desc") return compareNoteTitle(second, first);

    const firstTime = getNoteTime(first);
    const secondTime = getNoteTime(second);
    return sortMode === "updated-desc"
      ? secondTime - firstTime
      : firstTime - secondTime;
  });
};

export const filterAndSortLibraryNotes = (
  notes: Note[],
  filterText: string,
  sortMode: NoteLibrarySortMode,
) => {
  const keyword = filterText.trim().toLowerCase();
  const nextNotes = keyword
    ? notes.filter((note) =>
        normalizeNoteTitle(note.title).toLowerCase().includes(keyword),
      )
    : notes;

  return sortLibraryNotes(nextNotes, sortMode);
};

export const getNoteCascadeIds = (noteIds: string[], notes: Note[]) => {
  const childrenByParentId = new Map<string, string[]>();
  const collectedIds = new Set<string>();

  notes.forEach((note) => {
    if (!note.parentId) return;

    const children = childrenByParentId.get(note.parentId) ?? [];
    children.push(note._id);
    childrenByParentId.set(note.parentId, children);
  });

  const collect = (noteId: string) => {
    if (collectedIds.has(noteId)) return;

    collectedIds.add(noteId);
    childrenByParentId.get(noteId)?.forEach(collect);
  };

  noteIds.forEach(collect);
  return Array.from(collectedIds);
};

export const getTopLevelSelectedNotes = (
  notes: Note[],
  allNotes: Note[],
) => {
  const selectedIds = new Set(notes.map((note) => note._id));
  const parentByNoteId = new Map(
    allNotes.map((note) => [note._id, note.parentId ?? null]),
  );

  return notes.filter((note) => {
    const visitedIds = new Set<string>([note._id]);
    let parentId = parentByNoteId.get(note._id) ?? null;

    while (parentId && !visitedIds.has(parentId)) {
      if (selectedIds.has(parentId)) return false;

      visitedIds.add(parentId);
      parentId = parentByNoteId.get(parentId) ?? null;
    }

    return true;
  });
};

const buildNoteLibraryIndex = (
  notes: Note[],
  sortMode: NoteLibrarySortMode,
): NoteLibraryIndex => {
  const noteById = new Map(notes.map((note) => [note._id, note]));
  const childrenByParentId = new Map<string | null, Note[]>();

  notes.forEach((note) => {
    const parentId =
      note.parentId && noteById.has(note.parentId) ? note.parentId : null;
    const siblings = childrenByParentId.get(parentId) ?? [];
    siblings.push(note);
    childrenByParentId.set(parentId, siblings);
  });

  childrenByParentId.forEach((siblings, parentId) => {
    childrenByParentId.set(parentId, sortLibraryNotes(siblings, sortMode));
  });

  return {
    childrenByParentId,
    noteById,
    roots: childrenByParentId.get(null) ?? [],
  };
};

export const getNoteAncestorIds = (noteId: string, notes: Note[]) => {
  const noteById = new Map(notes.map((note) => [note._id, note]));
  const ancestorIds: string[] = [];
  const visitedIds = new Set<string>([noteId]);
  let parentId = noteById.get(noteId)?.parentId ?? null;

  while (parentId && noteById.has(parentId) && !visitedIds.has(parentId)) {
    ancestorIds.unshift(parentId);
    visitedIds.add(parentId);
    parentId = noteById.get(parentId)?.parentId ?? null;
  }

  return ancestorIds;
};

const getPathLabel = (note: Note, noteById: Map<string, Note>) => {
  const titles: string[] = [];
  const visitedIds = new Set<string>([note._id]);
  let parentId = note.parentId ?? null;

  while (parentId && noteById.has(parentId) && !visitedIds.has(parentId)) {
    const parentNote = noteById.get(parentId)!;
    titles.unshift(normalizeNoteTitle(parentNote.title));
    visitedIds.add(parentId);
    parentId = parentNote.parentId ?? null;
  }

  return titles.join(" / ");
};

const getTreeRows = (
  index: NoteLibraryIndex,
  expandedIds: string[],
): NoteLibraryRow[] => {
  const expandedSet = new Set(expandedIds);
  const rows: NoteLibraryRow[] = [];

  const appendRows = (
    notes: Note[],
    depth: number,
    ancestorIds: Set<string>,
  ) => {
    notes.forEach((note) => {
      if (ancestorIds.has(note._id)) return;

      const children = index.childrenByParentId.get(note._id) ?? [];
      const expanded = expandedSet.has(note._id);
      rows.push({
        depth,
        expanded,
        hasChildren: children.length > 0,
        matched: false,
        note,
      });

      if (expanded && children.length > 0) {
        appendRows(children, depth + 1, new Set([...ancestorIds, note._id]));
      }
    });
  };

  appendRows(index.roots, 0, new Set<string>());
  return rows;
};

const getSearchRows = (
  index: NoteLibraryIndex,
  keyword: string,
  sortMode: NoteLibrarySortMode,
): NoteLibraryRow[] => {
  const matches = sortLibraryNotes(
    [...index.noteById.values()].filter((note) =>
      normalizeNoteTitle(note.title).toLowerCase().includes(keyword),
    ),
    sortMode,
  );

  return matches.map((note) => {
    const children = index.childrenByParentId.get(note._id) ?? [];
    return {
      depth: 0,
      expanded: false,
      hasChildren: children.length > 0,
      matched: true,
      note,
      pathLabel: getPathLabel(note, index.noteById),
    };
  });
};

export const getNoteLibraryRows = ({
  expandedIds,
  filterText,
  notes,
  sortMode,
}: NoteLibraryRowsOptions) => {
  const keyword = filterText.trim().toLowerCase();
  const index = buildNoteLibraryIndex(notes, sortMode);
  const viewMode: NoteLibraryViewMode = keyword ? "search" : "tree";

  return {
    rows: keyword
      ? getSearchRows(index, keyword, sortMode)
      : getTreeRows(index, expandedIds),
    viewMode,
  };
};

export const getRecentTargetNotes = (recentNotes: Note[], allNotes: Note[]) => {
  const sourceNotes = recentNotes.length > 0 ? recentNotes : allNotes;
  return [...sourceNotes].sort(
    (first, second) => getNoteTime(second) - getNoteTime(first),
  );
};

export const formatNoteEditedTime = (note: Note) => {
  const rawTime = note.updatedAt || note.createdAt;
  if (!rawTime) return "--";

  const editedAt = dayjs(rawTime);
  if (!editedAt.isValid()) return "--";

  const daysAgo = dayjs().diff(editedAt, "day");
  if (daysAgo < 14) return editedAt.fromNow();
  if (editedAt.year() === dayjs().year()) return editedAt.format("M月D日");
  return editedAt.format("YYYY年M月D日");
};
