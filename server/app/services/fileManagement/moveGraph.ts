/** 文件夹层级图：folderId → parentId */
export type FolderGraph = Map<string, string | null>;
export type FolderNode = { _id: string; parentId?: string | null };

/** 收集文件夹的所有后代 ID（广度优先） */
export const collectDescendantFolderIds = (
  folders: FolderNode[],
  rootId: string,
): Set<string> => {
  const childrenMap = new Map<string, string[]>();
  for (const folder of folders) {
    const parentKey = folder.parentId ? String(folder.parentId) : "";
    const children = childrenMap.get(parentKey) ?? [];
    children.push(String(folder._id));
    childrenMap.set(parentKey, children);
  }
  const descendants = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const children = childrenMap.get(queue.shift()!) ?? [];
    for (const childId of children) {
      if (descendants.has(childId)) continue;
      descendants.add(childId);
      queue.push(childId);
    }
  }
  return descendants;
};

/** 判断目标文件夹是否为源文件夹自身或其后代（不可移动） */
export const isInvalidFolderTarget = (
  sourceId: string,
  targetId: string | null,
  graph: FolderGraph,
): boolean => {
  let currentId = targetId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === sourceId) return true;
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = graph.get(currentId) ?? null;
  }
  return false;
};
