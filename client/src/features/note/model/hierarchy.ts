import type { Note, SearchNote } from "@/api/note";

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

/** 目标选择器可选的笔记类型（普通笔记或搜索结果） */
export type NoteTarget = Note | SearchNote;

/**
 * 构建目标选择器的子节点索引，排除被阻断的笔记并按更新时间排序。
 * @param notes 全部层级笔记。
 * @param blockedIds 不可作为目标的笔记 ID。
 * @returns parentId → 子笔记列表的映射。
 */
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

/**
 * 过滤掉父级已包含在目标列表中的笔记，只保留最顶层的目标。
 * @param targets 候选目标列表。
 * @param hierarchyNotes 用于向上查找父节点的完整层级。
 * @returns 去重后的顶层目标列表。
 */
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
