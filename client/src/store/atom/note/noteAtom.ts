import { atomWithQuery } from "jotai-tanstack-query";
import { atom } from "jotai";
import { requireAccountScope } from "@/features/auth/model/account-scope";
import { noteKeys } from "@/features/note/model/keys";
import { getAllNotes, getRecentNotes } from "../../../api/note";
import { queryClient } from "../../../utils/queryClient";

/** 侧边栏树展开节点 ID 列表；账号变化时由生命周期桥清空。 */
export const expandedNodesAtom = atom<string[]>([]);

/** 笔记库视图展开节点 ID 列表；不跨账号持久化资源 ID。 */
export const libraryExpandedNodesAtom = atom<string[]>([]);

/** 全部笔记列表查询 atom，缓存 2 分钟 */
export const allNotesAtom = atomWithQuery(
  () => {
    const scope = requireAccountScope();
    return {
    queryKey: noteKeys.allLists(scope.ownerId),
    queryFn: async () => {
      const response = await getAllNotes();
      return response.data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    };
  },
  () => queryClient,
);

/** 最近编辑笔记列表查询 atom */
export const recentNoteAtom = atomWithQuery(() => {
  const scope = requireAccountScope();
  return {
  queryKey: noteKeys.recent(scope.ownerId),
  queryFn: async () => {
    const response = await getRecentNotes();
    return response.data || [];
  },
  };
});
