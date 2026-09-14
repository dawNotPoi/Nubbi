import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import { atomFamily, atomWithStorage } from "jotai/utils";
import { patchNoteAcrossCaches } from "@/features/note/model/cache";
import { noteKeys } from "@/features/note/model/keys";
import type { PatchNoteCacheVariables } from "@/features/note/model/types";
import {
  getAllNotes,
  getNoteAncestors,
  getNoteDetail,
  getRecentNotes,
} from "../../api/note";
import { queryClient } from "../../utils/queryClient";

export {
  createNoteAtom,
  deleteSingleNoteAtom,
  publishNoteAtom,
  updateNoteContentAtom,
  updateNotePropertiesAtom,
} from "./noteMutationAtom";

export const expandedNodesAtom = atomWithStorage<string[]>(
  "expanded-nodes",
  [],
);

export const libraryExpandedNodesAtom = atomWithStorage<string[]>(
  "note-library-expanded-nodes",
  [],
);

export const allNotesAtom = atomWithQuery(
  () => ({
    queryKey: noteKeys.allLists,
    queryFn: async () => {
      const response = await getAllNotes();
      return response.data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  }),
  () => queryClient,
);

export const recentNoteAtom = atomWithQuery(() => ({
  queryKey: noteKeys.recent(),
  queryFn: async () => {
    const response = await getRecentNotes();
    return response.data || [];
  },
}));

export const trashNoteAtom = atomWithQuery(() => ({
  queryKey: [...noteKeys.lists, "trash"],
  queryFn: async () => {
    const response = await getTrashNotes();
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
  (_get, _set, { noteId, parentId, properties }: PatchNoteCacheVariables) => {
    patchNoteAcrossCaches(queryClient, parentId, noteId, properties);
  },
);
