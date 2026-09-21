import type { Note, NoteWithContent } from "@/api/note";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import {
  assertAccountScopeCurrent,
  type AccountScope,
} from "@/features/auth/model/account-scope";
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
  ownerId: string,
  parentId: string | null | undefined,
): TreeListSnapshot => {
  const queryKey = noteKeys.tree(ownerId, parentId ?? null);
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
  scope: AccountScope,
  note: NoteWithContent,
): Promise<NoteListSnapshot> => {
  const { ownerId } = scope;
  const parentId = note.parentId ?? null;
  const queryKey = noteKeys.tree(ownerId, parentId);
  await queryClient.cancelQueries({ queryKey });
  assertAccountScopeCurrent(scope);
  const snapshot = snapshotTreeList(queryClient, ownerId, parentId);

  queryClient.setQueryData<Note[]>(queryKey, (old) =>
    old ? upsertNoteByCreatedAt(old, note) : old,
  );
  return snapshot;
};

export const optimisticRemoveNoteFromList = async (
  queryClient: QueryClient,
  scope: AccountScope,
  parentId: string | null | undefined,
  noteId: string,
): Promise<NoteListSnapshot> => {
  const { ownerId } = scope;
  const queryKey = noteKeys.tree(ownerId, parentId ?? null);
  await queryClient.cancelQueries({ queryKey });
  assertAccountScopeCurrent(scope);
  const snapshot = snapshotTreeList(queryClient, ownerId, parentId);

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
  scope: AccountScope,
  { noteId, parentId, properties }: UpdateNotePropertiesVariables,
): Promise<NotePropertiesSnapshot> => {
  const { ownerId } = scope;
  const currentParentId = parentId ?? null;
  const nextParentId = Object.prototype.hasOwnProperty.call(
    properties,
    "parentId",
  )
    ? properties.parentId ?? null
    : currentParentId;
  const currentKey = noteKeys.tree(ownerId, currentParentId);
  const nextKey = noteKeys.tree(ownerId, nextParentId);
  const detailKey = noteKeys.detail(ownerId, noteId);
  const moved = currentParentId !== nextParentId;

  await Promise.all([
    queryClient.cancelQueries({ queryKey: currentKey }),
    ...(moved ? [queryClient.cancelQueries({ queryKey: nextKey })] : []),
    queryClient.cancelQueries({ queryKey: detailKey }),
  ]);
  assertAccountScopeCurrent(scope);

  const lists = [snapshotTreeList(queryClient, ownerId, currentParentId)];
  if (moved) lists.push(snapshotTreeList(queryClient, ownerId, nextParentId));
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
    patchNoteTreeCache(queryClient, ownerId, currentParentId, noteId, properties);
  }
  patchNoteDetailCache(queryClient, ownerId, noteId, {
    ...properties,
    parentId: nextParentId,
  });

  return { lists, nextParentId, previousDetail };
};

export const rollbackOptimisticNotePropertiesUpdate = (
  queryClient: QueryClient,
  ownerId: string,
  noteId: string,
  snapshot?: NotePropertiesSnapshot,
) => {
  if (!snapshot) return;
  rollbackTreeLists(queryClient, snapshot.lists);
  if (snapshot.previousDetail !== undefined) {
    queryClient.setQueryData(
      noteKeys.detail(ownerId, noteId),
      snapshot.previousDetail,
    );
  }
};
