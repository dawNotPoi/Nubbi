import {
  getTrashNotes,
  purgeNote,
  restoreNote,
  type Note,
} from "@/api/note";
import { queryClient } from "@/utils/queryClient";
import { noteKeys } from "@/features/note/model/keys";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";

const trashQueryKey = [...noteKeys.lists, "trash"];

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

const invalidateNoteQueries = () => {
  queryClient.invalidateQueries({ queryKey: noteKeys.lists });
  queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
  queryClient.invalidateQueries({ queryKey: trashQueryKey });
};

export const restoreNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId }: { noteId: string }) => restoreNote(noteId),
  onSuccess: invalidateNoteQueries,
}));

export const purgeNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId }: { noteId: string }) => purgeNote(noteId),
  onSuccess: invalidateNoteQueries,
}));
