import type { Note, NoteSource } from "@/api/note";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { getTopLevelSelectedNotes } from "@/features/note/model/library";
import dayjs from "dayjs";

export type TrashSourceFilter = "all" | NoteSource;

export type TrashNoteRow = {
  depth: number;
  note: Note;
  parentInTrash: boolean;
  pathLabel: string;
};

type TrashRowsOptions = {
  filterText: string;
  notes: Note[];
  sourceFilter: TrashSourceFilter;
};

const getDeletedTime = (note: Note) => {
  const timestamp = note.deletedAt ? new Date(note.deletedAt).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const sortByDeletedTime = (notes: Note[]) =>
  [...notes].sort((first, second) => getDeletedTime(second) - getDeletedTime(first));

const getPathLabel = (note: Note, noteById: Map<string, Note>) => {
  const titles: string[] = [];
  const visitedIds = new Set<string>([note._id]);
  let parentId = note.parentId ?? null;

  while (parentId && noteById.has(parentId) && !visitedIds.has(parentId)) {
    const parent = noteById.get(parentId)!;
    titles.unshift(normalizeNoteTitle(parent.title));
    visitedIds.add(parentId);
    parentId = parent.parentId ?? null;
  }

  return titles.join(" / ");
};

const flattenTrashTree = (notes: Note[]): TrashNoteRow[] => {
  const noteById = new Map(notes.map((note) => [note._id, note]));
  const childrenByParentId = new Map<string, Note[]>();
  const roots: Note[] = [];

  notes.forEach((note) => {
    if (note.parentId && noteById.has(note.parentId)) {
      const siblings = childrenByParentId.get(note.parentId) ?? [];
      siblings.push(note);
      childrenByParentId.set(note.parentId, siblings);
    } else {
      roots.push(note);
    }
  });

  const rows: TrashNoteRow[] = [];
  const visitedIds = new Set<string>();
  const append = (items: Note[], depth: number) => {
    sortByDeletedTime(items).forEach((note) => {
      if (visitedIds.has(note._id)) return;
      visitedIds.add(note._id);
      rows.push({
        depth,
        note,
        parentInTrash: Boolean(note.parentId && noteById.has(note.parentId)),
        pathLabel: getPathLabel(note, noteById),
      });
      append(childrenByParentId.get(note._id) ?? [], depth + 1);
    });
  };

  append(roots, 0);
  append(notes.filter((note) => !visitedIds.has(note._id)), 0);
  return rows;
};

export const getTrashRows = ({ filterText, notes, sourceFilter }: TrashRowsOptions) => {
  const keyword = filterText.trim().toLocaleLowerCase();

  return flattenTrashTree(notes).filter(({ note }) => {
    if (sourceFilter !== "all" && note.source !== sourceFilter) return false;
    return !keyword || normalizeNoteTitle(note.title).toLocaleLowerCase().includes(keyword);
  });
};

export const getTrashActionNotes = (notes: Note[], selectedIds: string[]) => {
  const selectedSet = new Set(selectedIds);
  const selectedNotes = notes.filter((note) => selectedSet.has(note._id));
  return getTopLevelSelectedNotes(selectedNotes, notes);
};

export const canRestoreTrashNotes = (notes: Note[], allTrashNotes: Note[]) => {
  const trashIds = new Set(allTrashNotes.map((note) => note._id));
  return notes.every((note) => !note.parentId || !trashIds.has(note.parentId));
};

export const formatDeletedTime = (value?: string | null) => {
  if (!value) return "未知时间";
  const deletedAt = dayjs(value);
  return deletedAt.isValid() ? deletedAt.format("YYYY-MM-DD HH:mm") : "未知时间";
};
