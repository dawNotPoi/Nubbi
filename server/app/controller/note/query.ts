import note from "@/models/note";

const DEFAULT_TITLE = "Untitled";
const QUERY_LIMIT = 500;
const ACTIVE_NOTE_FILTER = { deletedAt: null };

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type NotePathItem = {
  _id: string;
  title: string;
};

export type NoteFilter = {
  status?: string;
  tags?: string[];
  published?: boolean;
};

export const getNoteById = async (id: string, userId: string) => {
  return await note.findOne({ _id: id, userId, ...ACTIVE_NOTE_FILTER });
};

export const getNoteAncestors = async (noteId: string, userId: string) => {
  const ancestors: NotePathItem[] = [];
  const visitedNoteIds = new Set<string>();
  let currentNote = await note
    .findOne({ _id: noteId, ...ACTIVE_NOTE_FILTER })
    .select("parentId userId")
    .lean();

  if (!currentNote || currentNote.userId !== userId) {
    return ancestors;
  }

  let currentParentId = currentNote.parentId ? String(currentNote.parentId) : null;

  while (currentParentId && !visitedNoteIds.has(currentParentId)) {
    visitedNoteIds.add(currentParentId);

    const parentNote = await note
      .findOne({ _id: currentParentId, ...ACTIVE_NOTE_FILTER })
      .select("title parentId userId")
      .lean();

    if (!parentNote || parentNote.userId !== userId) {
      break;
    }

    ancestors.unshift({
      _id: String(parentNote._id),
      title: parentNote.title || DEFAULT_TITLE,
    });
    currentParentId = parentNote.parentId ? String(parentNote.parentId) : null;
  }

  return ancestors;
};

export const getDirectChildren = async (parentId: string, userId: string) => {
  return await note
    .find({ parentId, userId, ...ACTIVE_NOTE_FILTER })
    .sort({ createdAt: -1 })
    .limit(QUERY_LIMIT)
    .select("-content");
};

export const getAllChildren = async (
  parentId: string,
  userId: string,
  visitedNoteIds = new Set<string>(),
) => {
  if (visitedNoteIds.has(parentId)) return [];
  visitedNoteIds.add(parentId);

  const children = await note
    .find({ parentId, userId, ...ACTIVE_NOTE_FILTER })
    .sort({ createdAt: -1 })
    .limit(QUERY_LIMIT);
  const allChildren: any[] = [];

  for (const child of children) {
    const childId = child._id.toString();
    if (visitedNoteIds.has(childId)) continue;

    allChildren.push(child);
    const grandChildren = await getAllChildren(
      childId,
      userId,
      visitedNoteIds,
    );
    allChildren.push(...grandChildren);
  }

  return allChildren;
};

export const getRootNotes = async (userId: string) => {
  return await note
    .find({ parentId: null, userId, ...ACTIVE_NOTE_FILTER })
    .sort({ createdAt: -1 })
    .limit(QUERY_LIMIT)
    .select("-content");
};

export const getAllNotes = async (userId: string) => {
  return await note
    .find({ userId, ...ACTIVE_NOTE_FILTER })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(QUERY_LIMIT)
    .select("-content");
};

export const findNotesByTags = async (userId: string, tags: string[]) => {
  return await note
    .find({
      userId,
      tags: { $in: tags },
      ...ACTIVE_NOTE_FILTER,
    })
    .sort({ createdAt: -1 })
    .limit(QUERY_LIMIT);
};

export const findNotesByFilter = async (userId: string, filter: NoteFilter) => {
  return await note
    .find({
      userId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.tags?.length ? { tags: { $in: filter.tags } } : {}),
      ...(typeof filter.published === "boolean"
        ? { published: filter.published }
        : {}),
      ...ACTIVE_NOTE_FILTER,
    })
    .sort({ createdAt: -1 })
    .limit(QUERY_LIMIT);
};

export const findNotesByStatus = async (userId: string, status: string) => {
  return await findNotesByFilter(userId, { status });
};

export const getNoteStats = async (userId: string) => {
  const userFilter = { userId, ...ACTIVE_NOTE_FILTER };
  const total = await note.countDocuments(userFilter);
  const published = await note.countDocuments({
    userId,
    published: true,
    ...ACTIVE_NOTE_FILTER,
  });
  const inbox = await note.countDocuments({
    userId,
    status: "inbox",
    ...ACTIVE_NOTE_FILTER,
  });
  const active = await note.countDocuments({
    userId,
    status: "active",
    ...ACTIVE_NOTE_FILTER,
  });
  const done = await note.countDocuments({
    userId,
    status: "done",
    ...ACTIVE_NOTE_FILTER,
  });
  const archived = await note.countDocuments({
    userId,
    status: "archived",
    ...ACTIVE_NOTE_FILTER,
  });

  return {
    total,
    published,
    inbox,
    active,
    done,
    archived,
  };
};

export const getTagStats = async (userId: string) => {
  const notes = await note
    .find({ userId, ...ACTIVE_NOTE_FILTER }, "tags")
    .limit(QUERY_LIMIT);
  const tagCount: { [key: string]: number } = {};

  notes.forEach((noteItem) => {
    noteItem.tags.forEach((tag) => {
      if (tag && tag.trim()) {
        const cleanTag = tag.trim();
        tagCount[cleanTag] = (tagCount[cleanTag] || 0) + 1;
      }
    });
  });

  return Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
};

export const getNotes = async (userId: string) => {
  return await note
    .find({
      userId,
      hasChildren: false,
      ...ACTIVE_NOTE_FILTER,
    })
    .limit(QUERY_LIMIT);
};

export const getRecentNotes = async (userId: string) => {
  return await note
    .find({
      userId,
      hasChildren: false,
      ...ACTIVE_NOTE_FILTER,
    })
    .sort({ updatedAt: -1 })
    .limit(QUERY_LIMIT);
};

export const getTrashNotes = async (userId: string) => {
  return await note
    .find({
      userId,
      deletedAt: { $ne: null },
    })
    .sort({ deletedAt: -1 })
    .limit(QUERY_LIMIT)
    .select("-content");
};

export const validateNoteUser = async (
  userId: string,
  noteId: string,
  options: { includeDeleted?: boolean } = {},
) => {
  const result = await note
    .findOne({
      _id: noteId,
      ...(options.includeDeleted ? {} : ACTIVE_NOTE_FILTER),
    })
    .select("userId");
  return result?.userId === userId;
};

export const validateNoteMoveTarget = async ({
  noteId,
  parentId,
  userId,
}: {
  noteId: string;
  parentId?: string | null;
  userId: string;
}) => {
  if (!parentId) return true;
  if (parentId === noteId) return false;

  try {
    const targetNote = await note
      .findOne({ _id: parentId, ...ACTIVE_NOTE_FILTER })
      .select("parentId userId")
      .lean();

    if (!targetNote || targetNote.userId !== userId) {
      return false;
    }

    const visitedNoteIds = new Set<string>();
    let currentParentId = targetNote.parentId
      ? String(targetNote.parentId)
      : null;

    while (currentParentId) {
      if (currentParentId === noteId || visitedNoteIds.has(currentParentId)) {
        return false;
      }

      visitedNoteIds.add(currentParentId);

      const parentNote = await note
        .findOne({ _id: currentParentId, ...ACTIVE_NOTE_FILTER })
        .select("parentId userId")
        .lean();

      if (!parentNote || parentNote.userId !== userId) {
        return false;
      }

      currentParentId = parentNote.parentId
        ? String(parentNote.parentId)
        : null;
    }

    return true;
  } catch {
    return false;
  }
};

export const searchNotes = async (userId: string, title: string) => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return [];

  const result = await note
    .find({
      userId,
      title: { $regex: escapeRegExp(normalizedTitle), $options: "i" },
      ...ACTIVE_NOTE_FILTER,
    })
    .limit(QUERY_LIMIT)
    .lean();

  const noteCache = new Map<string, { title: string; parentId?: string | null }>();

  const getParentInfo = async (noteId: string) => {
    if (noteCache.has(noteId)) {
      return noteCache.get(noteId)!;
    }

    const parentNote = await note
      .findOne({ _id: noteId, userId, ...ACTIVE_NOTE_FILTER })
      .select("title parentId")
      .lean();
    const parentInfo = {
      title: parentNote?.title || DEFAULT_TITLE,
      parentId: parentNote?.parentId ? String(parentNote.parentId) : null,
    };
    noteCache.set(noteId, parentInfo);
    return parentInfo;
  };

  const buildPathLabel = async (parentId?: any) => {
    if (!parentId) return "";

    const titles: string[] = [];
    let currentParentId: string | null = String(parentId);

    while (currentParentId) {
      const parentInfo = await getParentInfo(currentParentId);
      titles.unshift(parentInfo.title);
      currentParentId = parentInfo.parentId ?? null;
    }

    if (titles.length === 0) return "";
    if (titles.length <= 2) {
      return titles.join("/");
    }
    return [titles[0], "...", titles[titles.length - 1]].join("/");
  };

  return Promise.all(
    result.map(async (item) => ({
      ...item,
      pathLabel: await buildPathLabel(item.parentId),
    })),
  );
};
