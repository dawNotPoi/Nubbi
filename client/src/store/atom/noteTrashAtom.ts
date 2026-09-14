import {
  getTrashNotes,
  purgeNote,
  restoreNote,
  type Note,
} from "@/api/note";
import { queryClient } from "@/AppProvider";
import { noteKeys } from "@/features/note/model/keys";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";

const trashQueryKey = [...noteKeys.lists, "trash"];

export const trashNoteAtom = atomWithQuery(() => ({
  queryKey: trashQueryKey,
  queryFn: async () => {
    const notesById = new Map<string, Note>();
    const pageSize = 500;
    let offset = 0;

    while (true) {
      const response = await getTrashNotes(pageSize, offset);
      const page = response.data || [];
      page.forEach((note) => notesById.set(note._id, note));
      if (page.length < pageSize) return [...notesById.values()];
      offset += page.length;
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
