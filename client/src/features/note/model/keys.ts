export const noteKeys = {
  all: ["notes"] as const,
  lists: ["notes", "list"] as const,
  allLists: ["notes", "list", "all"] as const,
  treeRoot: ["notes", "list", "tree"] as const,
  tree: (parentId: string | null) =>
    ["notes", "list", "tree", parentId ?? "root"] as const,
  recentRoot: ["notes", "recent"] as const,
  recent: () => ["notes", "recent"] as const,
  detailRoot: ["notes", "detail"] as const,
  detail: (noteId: string) => ["notes", "detail", noteId] as const,
  ancestorsRoot: ["notes", "ancestors"] as const,
  ancestors: (noteId: string) => ["notes", "ancestors", noteId] as const,
  searchRoot: ["notes", "search"] as const,
  search: (keyword: string) => ["notes", "search", keyword] as const,
};
