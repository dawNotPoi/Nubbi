import {
  getTrashNotes,
  purgeNote,
  restoreNote,
  type Note,
} from "@/api/note";
import { queryClient } from "@/utils/queryClient";
import { noteKeys } from "@/features/note/model/keys";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";

/** 回收站列表 query key */
const trashQueryKey = [...noteKeys.lists, "trash"];

/**
 * 回收站笔记列表查询 atom。
 * 分页拉取全部回收站笔记，按 _id 去重。
 */
export const trashNoteAtom = atomWithQuery(() => ({
  queryKey: trashQueryKey,
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
}));

/** 恢复/清空后统一失效笔记相关缓存 */
const invalidateNoteQueries = () => {
  queryClient.invalidateQueries({ queryKey: noteKeys.lists });
  queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
  queryClient.invalidateQueries({ queryKey: trashQueryKey });
};

/** 恢复回收站笔记 mutation */
export const restoreNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId }: { noteId: string }) => restoreNote(noteId),
  onSuccess: invalidateNoteQueries,
}));

/** 彻底删除回收站笔记 mutation */
export const purgeNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId }: { noteId: string }) => purgeNote(noteId),
  onSuccess: invalidateNoteQueries,
}));
