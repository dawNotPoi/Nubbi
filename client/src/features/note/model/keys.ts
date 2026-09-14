export type NoteListScope = {
  parentId?: string | null;
  owner?: string | null;
};

export const noteKeys = {
  all: ["notes"] as const,
  lists: ["notes", "list"] as const,
  rootLists: ["notes", "list", "root"] as const,
  root: (owner: string) => ["notes", "list", "root", owner] as const,
  childrenLists: ["notes", "list", "children"] as const,
  children: (parentId: string) =>
    ["notes", "list", "children", parentId] as const,
  recentRoot: ["notes", "recent"] as const,
  recent: () => ["notes", "recent"] as const,
  detailRoot: ["notes", "detail"] as const,
  detail: (noteId: string) => ["notes", "detail", noteId] as const,
  ancestorsRoot: ["notes", "ancestors"] as const,
  ancestors: (noteId: string) => ["notes", "ancestors", noteId] as const,
  searchRoot: ["notes", "search"] as const,
  search: (keyword: string) => ["notes", "search", keyword] as const,
};

export const hasParentId = (parentId?: string | null): parentId is string =>
  typeof parentId === "string" && parentId.length > 0;

export const canResolveNoteListScope = ({ parentId, owner }: NoteListScope) =>
  hasParentId(parentId) || Boolean(owner);

export const noteListQueryKey = ({ parentId, owner }: NoteListScope) =>
  hasParentId(parentId)
    ? noteKeys.children(parentId)
    : noteKeys.root(owner ?? "");

export const sameQueryKey = (
  firstKey: readonly unknown[],
  secondKey: readonly unknown[],
) => JSON.stringify(firstKey) === JSON.stringify(secondKey);
