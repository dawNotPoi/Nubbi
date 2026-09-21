import { accountQueryKey } from "@/features/auth/model/account-scope";

/** 笔记私有查询 key；每次调用都必须显式传入 ownerId。 */
export const noteKeys = {
  all: (ownerId: string) => accountQueryKey(ownerId, ["notes"] as const),
  lists: (ownerId: string) =>
    accountQueryKey(ownerId, ["notes", "list"] as const),
  allLists: (ownerId: string) =>
    accountQueryKey(ownerId, ["notes", "list", "all"] as const),
  treeRoot: (ownerId: string) =>
    accountQueryKey(ownerId, ["notes", "list", "tree"] as const),
  tree: (ownerId: string, parentId: string | null) =>
    accountQueryKey(
      ownerId,
      ["notes", "list", "tree", parentId ?? "root"] as const,
    ),
  recentRoot: (ownerId: string) =>
    accountQueryKey(ownerId, ["notes", "recent"] as const),
  recent: (ownerId: string) =>
    accountQueryKey(ownerId, ["notes", "recent"] as const),
  detailRoot: (ownerId: string) =>
    accountQueryKey(ownerId, ["notes", "detail"] as const),
  detail: (ownerId: string, noteId: string) =>
    accountQueryKey(ownerId, ["notes", "detail", noteId] as const),
  ancestorsRoot: (ownerId: string) =>
    accountQueryKey(ownerId, ["notes", "ancestors"] as const),
  ancestors: (ownerId: string, noteId: string) =>
    accountQueryKey(ownerId, ["notes", "ancestors", noteId] as const),
  searchRoot: (ownerId: string) =>
    accountQueryKey(ownerId, ["notes", "search"] as const),
  search: (ownerId: string, keyword: string) =>
    accountQueryKey(ownerId, ["notes", "search", keyword] as const),
};
