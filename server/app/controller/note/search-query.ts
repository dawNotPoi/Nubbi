import note, { type NoteEntity } from "@/models/note";
import {
  ACTIVE_NOTE_FILTER,
  DEFAULT_NOTE_TITLE,
  NOTE_LIST_PROJECTION,
  NOTE_QUERY_LIMIT,
} from "./query-config";
import type { NoteSearchItem } from "./query-types";

type ParentInfo = {
  title: string;
  parentId: string | null;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const searchNotes = async (
  userId: string,
  title: string,
): Promise<NoteSearchItem[]> => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return [];

  const result = await note
    .find({
      userId,
      title: { $regex: escapeRegExp(normalizedTitle), $options: "i" },
      ...ACTIVE_NOTE_FILTER,
    })
    .limit(NOTE_QUERY_LIMIT)
    .select(NOTE_LIST_PROJECTION)
    .lean();
  const noteCache = new Map<string, ParentInfo>();

  const getParentInfo = async (noteId: string): Promise<ParentInfo> => {
    const cached = noteCache.get(noteId);
    if (cached) return cached;

    const parentNote = await note
      .findOne({ _id: noteId, userId, ...ACTIVE_NOTE_FILTER })
      .select("title parentId")
      .lean();
    const parentInfo: ParentInfo = {
      title: parentNote?.title || DEFAULT_NOTE_TITLE,
      parentId: parentNote?.parentId ? String(parentNote.parentId) : null,
    };
    noteCache.set(noteId, parentInfo);
    return parentInfo;
  };

  const buildPathLabel = async (
    parentId?: NoteEntity["parentId"] | string | null,
  ): Promise<string> => {
    if (!parentId) return "";

    const titles: string[] = [];
    const visitedParentIds = new Set<string>();
    let currentParentId: string | null = String(parentId);

    while (
      currentParentId &&
      !visitedParentIds.has(currentParentId)
    ) {
      visitedParentIds.add(currentParentId);
      const parentInfo = await getParentInfo(currentParentId);
      titles.unshift(parentInfo.title);
      currentParentId = parentInfo.parentId;
    }

    if (titles.length <= 2) return titles.join("/");
    return [titles[0], "...", titles[titles.length - 1]].join("/");
  };

  return Promise.all(
    result.map(async (item) => ({
      ...item,
      pathLabel: await buildPathLabel(item.parentId),
    })),
  );
};
