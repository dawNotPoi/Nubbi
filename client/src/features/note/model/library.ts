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

  return [...nextNotes].sort((first, second) => {
    if (sortMode === "name-asc") return compareNoteTitle(first, second);
    if (sortMode === "name-desc") return compareNoteTitle(second, first);

    const firstTime = getNoteTime(first);
    const secondTime = getNoteTime(second);
    return sortMode === "updated-desc"
      ? secondTime - firstTime
      : firstTime - secondTime;
  });
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
