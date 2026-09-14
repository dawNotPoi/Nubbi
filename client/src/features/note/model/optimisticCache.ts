import type { Note, NoteWithContent } from "@/api/note";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { patchNoteDetailCache, patchNoteTreeCache } from "./cache";
import { noteKeys } from "./keys";
import type { UpdateNotePropertiesVariables } from "./types";

type TreeListSnapshot = {
  previousNotes?: Note[];
  queryKey: QueryKey;
};

export type NoteListSnapshot = TreeListSnapshot;

export type NotePropertiesSnapshot = {
  lists: TreeListSnapshot[];
  nextParentId: string | null;
  previousDetail?: NoteWithContent;
};

const getCreatedAtTime = (note: Note) =>
  new Date(note.createdAt ?? 0).getTime() || 0;

const upsertNoteByCreatedAt = (notes: Note[], note: Note) =>
  [note, ...notes.filter((cachedNote) => cachedNote._id !== note._id)].sort(
    (first, second) => getCreatedAtTime(second) - getCreatedAtTime(first),
  );

const snapshotTreeList = (
  queryClient: QueryClient,
  parentId: string | null | undefined,
): TreeListSnapshot => {
  const queryKey = noteKeys.tree(parentId ?? null);
  return {
    previousNotes: queryClient.getQueryData<Note[]>(queryKey),
    queryKey,
  };
};

const rollbackTreeLists = (
  queryClient: QueryClient,
  snapshots: TreeListSnapshot[],
) => {
  snapshots.forEach(({ previousNotes, queryKey }) => {
    if (previousNotes !== undefined) {
      queryClient.setQueryData(queryKey, previousNotes);
    }
  });
};

export const optimisticPrependNoteToList = async (
  queryClient: QueryClient,
  note: NoteWithContent,
): Promise<NoteListSnapshot> => {
  const parentId = note.parentId ?? null;
  const queryKey = noteKeys.tree(parentId);
  await queryClient.cancelQueries({ queryKey });
  const snapshot = snapshotTreeList(queryClient, parentId);

  queryClient.setQueryData<Note[]>(queryKey, (old) =>
    old ? upsertNoteByCreatedAt(old, note) : old,
  );
  return snapshot;
};

export const optimisticRemoveNoteFromList = async (
  queryClient: QueryClient,
  parentId: string | null | undefined,
  noteId: string,
): Promise<NoteListSnapshot> => {
  const queryKey = noteKeys.tree(parentId ?? null);
  await queryClient.cancelQueries({ queryKey });
  const snapshot = snapshotTreeList(queryClient, parentId);

  queryClient.setQueryData<Note[]>(queryKey, (old) =>
    old?.filter((note) => note._id !== noteId),
  );
  return snapshot;
};

export const rollbackNoteListSnapshot = (
  queryClient: QueryClient,
  snapshot?: NoteListSnapshot,
) => {
  if (snapshot) rollbackTreeLists(queryClient, [snapshot]);
};

export const applyOptimisticNotePropertiesUpdate = async (
  queryClient: QueryClient,
  { noteId, parentId, properties }: UpdateNotePropertiesVariables,
): Promise<NotePropertiesSnapshot> => {
  const currentParentId = parentId ?? null;
  const nextParentId = Object.prototype.hasOwnProperty.call(
    properties,
    "parentId",
  )
    ? properties.parentId ?? null
    : currentParentId;
  const currentKey = noteKeys.tree(currentParentId);
  const nextKey = noteKeys.tree(nextParentId);
  const detailKey = noteKeys.detail(noteId);
  const moved = currentParentId !== nextParentId;

  await Promise.all([
    queryClient.cancelQueries({ queryKey: currentKey }),
    ...(moved ? [queryClient.cancelQueries({ queryKey: nextKey })] : []),
    queryClient.cancelQueries({ queryKey: detailKey }),
  ]);

  const lists = [snapshotTreeList(queryClient, currentParentId)];
  if (moved) lists.push(snapshotTreeList(queryClient, nextParentId));
  const previousDetail =
    queryClient.getQueryData<NoteWithContent>(detailKey);
  const currentNote =
    lists[0].previousNotes?.find((note) => note._id === noteId) ??
    previousDetail;

  if (moved) {
    queryClient.setQueryData<Note[]>(currentKey, (old) =>
      old?.filter((note) => note._id !== noteId),
    );
    if (currentNote) {
      const nextNote = {
        ...currentNote,
        ...properties,
        parentId: nextParentId,
      } as Note;
      queryClient.setQueryData<Note[]>(nextKey, (old) =>
        old ? upsertNoteByCreatedAt(old, nextNote) : old,
      );
    }
  } else {
    patchNoteTreeCache(queryClient, currentParentId, noteId, properties);
  }
  patchNoteDetailCache(queryClient, noteId, {
    ...properties,
    parentId: nextParentId,
  });

  return { lists, nextParentId, previousDetail };
};

export const rollbackOptimisticNotePropertiesUpdate = (
  queryClient: QueryClient,
  noteId: string,
  snapshot?: NotePropertiesSnapshot,
) => {
  if (!snapshot) return;
  rollbackTreeLists(queryClient, snapshot.lists);
  if (snapshot.previousDetail !== undefined) {
    queryClient.setQueryData(
      noteKeys.detail(noteId),
      snapshot.previousDetail,
    );
  }
};
