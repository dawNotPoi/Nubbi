import {
  getTrashNotes,
  purgeNote,
  restoreNote,
  type Note,
} from "@/api/note";
import { queryClient } from "@/utils/queryClient";
import { noteKeys } from "@/features/note/model/keys";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import {
  isAccountScopeCurrent,
  requireAccountScope,
  type AccountScope,
} from "@/features/auth/model/account-scope";

/** @param ownerId 当前账号 ID。@returns 当前账号的回收站 key。 */
const trashQueryKey = (ownerId: string) =>
  [...noteKeys.lists(ownerId), "trash"] as const;

/**
 * 回收站笔记列表查询 atom。
 * 分页拉取全部回收站笔记，按 _id 去重。
 */
export const trashNoteAtom = atomWithQuery(() => {
  const scope = requireAccountScope();
  return {
  queryKey: trashQueryKey(scope.ownerId),
  queryFn: async () => {
    const notesById = new Map<string, Note>();
    const pageSize = 50;
    let offset = 0;

    while (true) {
      const response = await getTrashNotes({ limit: pageSize, offset });
      const page = response.data;
      page.items.forEach((note) => notesById.set(note._id, note));

      if (!page.hasMore) return [...notesById.values()];
      if (page.nextOffset === null || page.nextOffset <= offset) {
        throw new Error("Invalid trash pagination response");
      }
      offset = page.nextOffset;
    }
  },
  };
});

/** 恢复/清空后统一失效笔记相关缓存 */
const invalidateNoteQueries = (scope: AccountScope): void => {
  queryClient.invalidateQueries({ queryKey: noteKeys.lists(scope.ownerId) });
  queryClient.invalidateQueries({ queryKey: noteKeys.recent(scope.ownerId) });
  queryClient.invalidateQueries({ queryKey: trashQueryKey(scope.ownerId) });
};

/** 恢复回收站笔记 mutation */
export const restoreNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId }: { noteId: string }) => restoreNote(noteId),
  onMutate: () => ({ scope: requireAccountScope() }),
  onSuccess: (_response, _variables, context) => {
    if (context && isAccountScopeCurrent(context.scope)) {
      invalidateNoteQueries(context.scope);
    }
  },
}));

/** 彻底删除回收站笔记 mutation */
export const purgeNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId }: { noteId: string }) => purgeNote(noteId),
  onMutate: () => ({ scope: requireAccountScope() }),
  onSuccess: (_response, _variables, context) => {
    if (context && isAccountScopeCurrent(context.scope)) {
      invalidateNoteQueries(context.scope);
    }
  },
}));
