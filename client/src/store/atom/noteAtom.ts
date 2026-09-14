import { atom } from "jotai";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import { atomFamily, atomWithStorage } from "jotai/utils";
import {
  applyOptimisticNoteContentUpdate,
  applyOptimisticNotePropertiesUpdate,
  applySuccessfulNoteContentUpdate,
  invalidateNotePropertiesUpdate,
  markNoteListQueryStale,
  optimisticPrependNoteToList,
  optimisticRemoveNoteFromList,
  patchNoteAcrossCaches,
  patchNoteDetailCache,
  rollbackNoteListSnapshot,
  rollbackOptimisticNoteContentUpdate,
  rollbackOptimisticNotePropertiesUpdate,
} from "@/features/note/model/cache";
import { noteKeys, noteListQueryKey } from "@/features/note/model/keys";
import type {
  CreateNoteVariables,
  DeleteNoteVariables,
  PatchNoteCacheVariables,
  UpdateNotePropertiesVariables,
} from "@/features/note/model/types";
import {
  createNote,
  deleteNote,
  getAllNotes,
  getDirectChildren,
  getNoteAncestors,
  getNoteDetail,
  getRecentNotes,
  getRootNotes,
  updateNoteContent,
  updateNoteProperties,
} from "../../api/note";
import { queryClient } from "../../AppProvider";

export const expandedNodesAtom = atomWithStorage<string[]>(
  "expanded-nodes",
  [],
);

export const rootNotesAtom = atomFamily((owner: string) =>
  atomWithQuery(
    () => ({
      queryKey: noteListQueryKey({ owner }),
      queryFn: async () => {
        const response = await getRootNotes(owner);
        return response.data || [];
      },
      enabled: Boolean(owner),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }),
    () => queryClient,
  ),
);

export const allNotesAtom = atomFamily((owner: string) =>
  atomWithQuery(
    () => ({
      queryKey: noteKeys.allList(owner),
      queryFn: async () => {
        const response = await getAllNotes();
        return response.data || [];
      },
      enabled: Boolean(owner),
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }),
    () => queryClient,
  ),
);

export const noteChildrenAtom = atomFamily((noteId: string) =>
  atomWithQuery(() => ({
    queryKey: noteListQueryKey({ parentId: noteId }),
    queryFn: async () => {
      const response = await getDirectChildren(noteId);
      return response.data;
    },
    enabled: Boolean(noteId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })),
);

export const recentNoteAtom = atomWithQuery(() => ({
  queryKey: noteKeys.recent(),
  queryFn: async () => {
    const response = await getRecentNotes();
    return response.data || [];
  },
}));

export const noteDetailAtom = atomFamily((noteId: string) =>
  atomWithQuery(() => ({
    queryKey: noteKeys.detail(noteId),
    queryFn: async () => {
      const response = await getNoteDetail(noteId);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })),
);

export const noteAncestorsAtom = atomFamily((noteId: string) =>
  atomWithQuery(() => ({
    queryKey: noteKeys.ancestors(noteId),
    queryFn: async () => {
      const response = await getNoteAncestors(noteId);
      return response.data || [];
    },
    enabled: Boolean(noteId),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })),
);

export const patchNotePropertiesCacheAtom = atom(
  null,
  (_get, _set, { noteId, properties }: PatchNoteCacheVariables) => {
    patchNoteAcrossCaches(queryClient, noteId, properties);
  },
);

export const createNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ note }: CreateNoteVariables) => createNote(note),
  onMutate: async ({ note, owner }) => {
    const scope = { parentId: note.parentId, owner };
    return optimisticPrependNoteToList(queryClient, scope, note);
  },
  onError: (error, _variables, context) => {
    console.error("create Note error", error);
    rollbackNoteListSnapshot(queryClient, context);
  },
  onSuccess: (response, variables) => {
    const scope = { parentId: variables.note.parentId, owner: variables.owner };
    const nextNote = response.data || variables.note;

    patchNoteAcrossCaches(queryClient, variables.note._id, nextNote);
    patchNoteDetailCache(queryClient, variables.note._id, nextNote);
    markNoteListQueryStale(queryClient, scope);
    queryClient.invalidateQueries({
      queryKey: noteKeys.recent(),
      refetchType: "none",
    });
  },
}));

export const deleteSingleNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId }: DeleteNoteVariables) => deleteNote(noteId),
  onMutate: async ({ noteId, parentId, owner }) => {
    const scope = { parentId, owner };
    return optimisticRemoveNoteFromList(queryClient, scope, noteId);
  },
  onError: (error, _variables, context) => {
    rollbackNoteListSnapshot(queryClient, context);
    console.error("delete Note error", error);
  },
  onSuccess: (_data, variables) => {
    markNoteListQueryStale(queryClient, {
      parentId: variables.parentId,
      owner: variables.owner,
    });
    queryClient.invalidateQueries({
      queryKey: noteKeys.recent(),
      refetchType: "none",
    });
    queryClient.invalidateQueries({
      queryKey: noteKeys.detailRoot,
      refetchType: "none",
    });
  },
}));

export const updateNoteContentAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
    updateNoteContent(noteId, content),
  onMutate: async ({ noteId, content }) => {
    return applyOptimisticNoteContentUpdate(queryClient, noteId, content);
  },
  onError: (error, variables, context) => {
    rollbackOptimisticNoteContentUpdate(queryClient, variables.noteId, context);
    console.error("update Note content error", error);
  },
  onSuccess: (response, variables) => {
    applySuccessfulNoteContentUpdate(queryClient, variables.noteId, response.data);
  },
}));

export const updateNotePropertiesAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId, properties }: UpdateNotePropertiesVariables) =>
    updateNoteProperties(noteId, properties),
  onMutate: async (variables) => {
    return applyOptimisticNotePropertiesUpdate(queryClient, variables);
  },
  onError: (_error, variables, context) => {
    rollbackOptimisticNotePropertiesUpdate(queryClient, variables, context);
  },
  onSuccess: (_data, _variables, context) => {
    if (context) {
      invalidateNotePropertiesUpdate(queryClient, context);
    }
  },
}));
