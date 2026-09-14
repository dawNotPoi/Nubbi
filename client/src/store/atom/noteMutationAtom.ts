import { atomWithMutation } from "jotai-tanstack-query";
import {
  applyOptimisticNoteContentUpdate,
  applySuccessfulNoteContentUpdate,
  patchNoteAcrossCaches,
  patchNoteDetailCache,
  replaceNoteInTreeCache,
} from "@/features/note/model/cache";
import { noteKeys } from "@/features/note/model/keys";
import {
  applyOptimisticNotePropertiesUpdate,
  optimisticPrependNoteToList,
  optimisticRemoveNoteFromList,
  rollbackNoteListSnapshot,
  rollbackOptimisticNotePropertiesUpdate,
} from "@/features/note/model/optimisticCache";
import type {
  CreateNoteVariables,
  DeleteNoteVariables,
  UpdateNoteContentVariables,
  UpdateNotePropertiesVariables,
} from "@/features/note/model/types";
import {
  createNote,
  deleteNote,
  publishNote,
  updateNoteContent,
  updateNoteProperties,
} from "../../api/note";
import { queryClient } from "../../utils/queryClient";

const invalidateTreeLists = () => {
  queryClient.invalidateQueries({ queryKey: noteKeys.treeRoot });
  queryClient.invalidateQueries({ queryKey: noteKeys.allLists });
  queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
};

export const createNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ note }: CreateNoteVariables) => createNote(note),
  onMutate: ({ note }) => optimisticPrependNoteToList(queryClient, note),
  onError: (error, variables, context) => {
    rollbackNoteListSnapshot(queryClient, context);
    queryClient.removeQueries({
      exact: true,
      queryKey: noteKeys.detail(variables.note._id),
    });
    queryClient.removeQueries({
      exact: true,
      queryKey: noteKeys.ancestors(variables.note._id),
    });
    invalidateTreeLists();
    console.error("create Note error", error);
  },
  onSuccess: (response, variables) => {
    const nextNote = response.data || variables.note;
    replaceNoteInTreeCache(
      queryClient,
      nextNote.parentId ?? null,
      nextNote,
    );
    queryClient.setQueryData(noteKeys.detail(variables.note._id), {
      ...variables.note,
      ...response.data,
    });
    invalidateTreeLists();
  },
}));

export const deleteSingleNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId }: DeleteNoteVariables) => deleteNote(noteId),
  onMutate: ({ noteId, parentId }) =>
    optimisticRemoveNoteFromList(queryClient, parentId, noteId),
  onError: (error, _variables, context) => {
    rollbackNoteListSnapshot(queryClient, context);
    queryClient.invalidateQueries({ queryKey: noteKeys.treeRoot });
    console.error("delete Note error", error);
  },
  onSuccess: (_data, variables) => {
    queryClient.removeQueries({
      exact: true,
      queryKey: noteKeys.detail(variables.noteId),
    });
    queryClient.removeQueries({
      exact: true,
      queryKey: noteKeys.ancestors(variables.noteId),
    });
    queryClient.removeQueries({
      exact: true,
      queryKey: noteKeys.tree(variables.noteId),
    });
    invalidateTreeLists();
    queryClient.invalidateQueries({ queryKey: noteKeys.ancestorsRoot });
    queryClient.invalidateQueries({
      queryKey: [...noteKeys.lists, "trash"],
    });
  },
}));

export const publishNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId, published }: { noteId: string; published: boolean }) =>
    publishNote(noteId, published),
  onSuccess: (response, variables) => {
    if (response.data) {
      patchNoteDetailCache(queryClient, variables.noteId, response.data);
    }
    queryClient.invalidateQueries({ queryKey: noteKeys.allLists });
    queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
  },
}));

export const updateNoteContentAtom = atomWithMutation(() => ({
  mutationFn: ({
    baseContentRevision,
    clientMutationId,
    content,
    noteId,
  }: UpdateNoteContentVariables) =>
    updateNoteContent(noteId, {
      baseContentRevision,
      clientMutationId,
      content,
    }),
  onMutate: ({ noteId }) =>
    applyOptimisticNoteContentUpdate(queryClient, noteId),
  onError: (error, variables) => {
    queryClient.invalidateQueries({ queryKey: noteKeys.allLists });
    queryClient.invalidateQueries({
      queryKey: noteKeys.detail(variables.noteId),
    });
    console.error("update Note content error", error);
  },
  onSuccess: (response, variables) => {
    applySuccessfulNoteContentUpdate(
      queryClient,
      variables.noteId,
      response.data,
    );
  },
}));

export const updateNotePropertiesAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId, properties }: UpdateNotePropertiesVariables) =>
    updateNoteProperties(noteId, properties),
  onMutate: (variables) =>
    applyOptimisticNotePropertiesUpdate(queryClient, variables),
  onError: (error, variables, context) => {
    rollbackOptimisticNotePropertiesUpdate(
      queryClient,
      variables.noteId,
      context,
    );
    queryClient.invalidateQueries({ queryKey: noteKeys.treeRoot });
    queryClient.invalidateQueries({
      queryKey: noteKeys.detail(variables.noteId),
    });
    console.error("update Note properties error", error);
  },
  onSuccess: (response, variables, context) => {
    if (response.data) {
      patchNoteAcrossCaches(
        queryClient,
        context?.nextParentId ?? variables.parentId,
        variables.noteId,
        response.data,
      );
    }
    if (Object.prototype.hasOwnProperty.call(variables.properties, "parentId")) {
      queryClient.invalidateQueries({ queryKey: noteKeys.treeRoot });
    }
    queryClient.invalidateQueries({ queryKey: noteKeys.allLists });
    queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
    queryClient.invalidateQueries({ queryKey: noteKeys.ancestorsRoot });
  },
}));
