import note from "@/models/note";

const DEFAULT_TITLE = "Untitled";

export type NotePathItem = {
  _id: string;
  title: string;
};

// 根据ID获取笔记（不增加观看次数）
export const getNoteById = async (id: string) => {
  return await note.findById(id);
};

export const getNoteAncestors = async (noteId: string, userId: string) => {
  const ancestors: NotePathItem[] = [];
  const visitedNoteIds = new Set<string>();
  let currentNote = await note.findById(noteId).select("parentId userId").lean();

  if (!currentNote || currentNote.userId !== userId) {
    return ancestors;
  }

  let currentParentId = currentNote.parentId ? String(currentNote.parentId) : null;

  while (currentParentId && !visitedNoteIds.has(currentParentId)) {
    visitedNoteIds.add(currentParentId);

    const parentNote = await note
      .findById(currentParentId)
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

// 获取笔记的直接子笔记
export const getDirectChildren = async (parentId: string) => {
  return await note
    .find({ parentId: parentId })
    .sort({ createdAt: -1 })
    .select("-content"); // 不返回内容，只返回元数据
};

// 获取笔记的所有子笔记（递归）
export const getAllChildren = async (parentId: string) => {
  const children = await note
    .find({ parentId: parentId })
    .sort({ createdAt: -1 });
  // 递归获取每个子笔记的子笔记
  const allChildren: any[] = [];
  for (const child of children) {
    allChildren.push(child);
    const grandChildren = await getAllChildren(child._id.toString());
    allChildren.push(...grandChildren);
  }

  return allChildren;
};

// 获取根级笔记（没有父级的笔记）
export const getRootNotes = async (userId: string) => {
  return await note
    .find({ parentId: null, userId })
    .sort({ createdAt: -1 })
    .select("-content");
};

// 根据标签查询笔记
export const findNotesByTags = async (tags: string[]) => {
  return await note
    .find({
      tags: { $in: tags },
    })
    .sort({ createdAt: -1 });
};

// 根据状态查询笔记
export const findNotesByStatus = async (status: string) => {
  return await note.find({ status }).sort({ createdAt: -1 });
};

// 获取笔记统计信息
export const getNoteStats = async () => {
  const total = await note.countDocuments();
  const published = await note.countDocuments({ status: "Published" });
  const draft = await note.countDocuments({ status: "Draft" });
  const archived = await note.countDocuments({ status: "Archived" });

  return {
    total,
    published,
    draft,
    archived,
  };
};

// 获取标签统计信息（每个标签的笔记数量）
export const getTagStats = async () => {
  const notes = await note.find({}, "tags");
  const tagCount: { [key: string]: number } = {};
  notes.forEach((note) => {
    if (note.meta.tags && Array.isArray(note.meta.tags)) {
      note.meta.tags.forEach((tag) => {
        if (tag && tag.trim()) {
          const cleanTag = tag.trim();
          tagCount[cleanTag] = (tagCount[cleanTag] || 0) + 1;
        }
      });
    }
  });

  // 转换为数组格式，按笔记数量降序排列
  const tagStats = Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return tagStats;
};

export const getNotes = async (userId: string) => {
  return await note.find({
    userId: userId,
    $or: [{ children: { $exists: false } }, { children: { $size: 0 } }],
  });
};

export const getRecentNotes = async (userId: string) => {
  return await note
    .find({
      userId: userId,
      $or: [{ children: { $exists: false } }, { children: { $size: 0 } }],
    })
    .sort({ updatedAt: -1 });
};

export const validateNoteUser = async (userId: string, noteId: string) => {
  const Result = await note.findById(noteId);
  if (Result?.userId === userId) return true;
  else return false;
};

export const searchNotes = async (userId: string, title: string) => {
  const result = await note
    .find({
      userId: userId,
      title: { $regex: title, $options: "i" },
    })
    .lean();

  const noteCache = new Map<string, { title: string; parentId?: string | null }>();

  const getParentInfo = async (noteId: string) => {
    if (noteCache.has(noteId)) {
      return noteCache.get(noteId)!;
    }

    const parentNote = await note.findById(noteId).select("title parentId").lean();
    const parentInfo = {
      title: parentNote?.title || "未命名文档",
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
