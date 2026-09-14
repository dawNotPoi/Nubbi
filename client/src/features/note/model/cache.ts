import { recordToMetaEntries, type Note, type NotePathItem, type NoteWithContent } from "@/api/note";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import {
  canResolveNoteListScope,
  hasParentId,
  noteKeys,
  noteListQueryKey,
  sameQueryKey,
  type NoteListScope,
} from "./keys";
import type { UpdateNotePropertiesVariables } from "./types";

type NoteCachePatch = Omit<
  Partial<NoteWithContent>,
  "date" | "expiresAt" | "meta"
> & {
  date?: string | Date;
  expiresAt?: string | Date | null;
  meta?: NoteWithContent["meta"] | Record<string, unknown>;
};

export type NoteListSnapshot = {
  canPatch: boolean;
  caches?: NoteListCacheSnapshot[];
  hadPreviousData?: boolean;
  previousNotes?: Note[];
  queryKey?: QueryKey;
  scope: NoteListScope;
};

type NoteListCacheSnapshot = {
  hadPreviousData: boolean;
  previousNotes?: Note[];
  queryKey: QueryKey;
};

export type NotePropertiesSnapshot = {
  canPatchCurrentList: boolean;
  canPatchNextList: boolean;
  currentScope: NoteListScope;
  nextParentId?: string | null;
  nextScope: NoteListScope;
  previousDetail?: NoteWithContent;
  previousNextNotes?: Note[];
  previousNotes?: Note[];
  previousRecentNotes?: Note[];
};

export type NoteContentSnapshot = {
  previousDetail?: NoteWithContent;
  previousRecentNotes?: Note[];
};

export const getNoteListScope = ({
  parentId,
  owner,
}: NoteListScope): NoteListScope => ({
  parentId,
  owner,
});

export const invalidateNoteListQuery = (
  queryClient: QueryClient,
  { parentId, owner }: NoteListScope,
) => {
  if (hasParentId(parentId)) {
    queryClient.invalidateQueries({
      queryKey: noteListQueryKey({ parentId }),
    });
    queryClient.invalidateQueries({ queryKey: noteKeys.allLists });
    return;
  }

  if (owner) {
    queryClient.invalidateQueries({
      queryKey: noteListQueryKey({ owner }),
    });
    queryClient.invalidateQueries({ queryKey: noteKeys.allLists });
    return;
  }

  queryClient.invalidateQueries({ queryKey: noteKeys.allLists });
  queryClient.invalidateQueries({ queryKey: noteKeys.rootLists });
};

export const markNoteListQueryStale = (
  queryClient: QueryClient,
  { parentId, owner }: NoteListScope,
) => {
  if (hasParentId(parentId)) {
    queryClient.invalidateQueries({
      queryKey: noteListQueryKey({ parentId }),
      refetchType: "none",
    });
    queryClient.invalidateQueries({
      queryKey: noteKeys.allLists,
      refetchType: "none",
    });
    return;
  }

  if (owner) {
    queryClient.invalidateQueries({
      queryKey: noteListQueryKey({ owner }),
      refetchType: "none",
    });
    queryClient.invalidateQueries({
      queryKey: noteKeys.allLists,
      refetchType: "none",
    });
    return;
  }

  queryClient.invalidateQueries({
    queryKey: noteKeys.allLists,
    refetchType: "none",
  });
  queryClient.invalidateQueries({
    queryKey: noteKeys.rootLists,
    refetchType: "none",
  });
};

export const isNoteListQueryKey = (queryKey: readonly unknown[]) => {
  return (
    queryKey[0] === noteKeys.lists[0] &&
    queryKey[1] === noteKeys.lists[1] &&
    (queryKey[2] === noteKeys.allLists[2] ||
      queryKey[2] === noteKeys.rootLists[2] ||
      queryKey[2] === noteKeys.childrenLists[2])
  );
};

const queryKeyId = (queryKey: QueryKey) => JSON.stringify(queryKey);

const getUniqueQueryKeys = (queryKeys: QueryKey[]) => {
  const uniqueKeys = new Map<string, QueryKey>();
  queryKeys.forEach((queryKey) => {
    uniqueKeys.set(queryKeyId(queryKey), queryKey);
  });
  return Array.from(uniqueKeys.values());
};

const getCachedNoteListQueryKeys = (queryClient: QueryClient) =>
  queryClient
    .getQueryCache()
    .findAll({ queryKey: noteKeys.lists })
    .filter((query) => isNoteListQueryKey(query.queryKey))
    .map((query) => query.queryKey);

const getCachedAllNoteListQueryKeys = (queryClient: QueryClient) =>
  queryClient
    .getQueryCache()
    .findAll({ queryKey: noteKeys.allLists })
    .map((query) => query.queryKey);

const getNoteListSnapshots = (
  queryClient: QueryClient,
  queryKeys: QueryKey[],
): NoteListCacheSnapshot[] =>
  getUniqueQueryKeys(queryKeys).map((queryKey) => {
    const previousNotes = queryClient.getQueryData<Note[]>(queryKey);
    return {
      hadPreviousData: previousNotes !== undefined,
      previousNotes,
      queryKey,
    };
  });

const prependUniqueNote = (notes: Note[], note: Note) => [
  note,
  ...notes.filter((cachedNote) => cachedNote._id !== note._id),
];

const normalizeNotePatch = (
  patch: NoteCachePatch,
): Partial<NoteWithContent> => ({
  ...patch,
  date:
    typeof patch.date === "object" && patch.date instanceof Date
      ? patch.date.toISOString()
      : patch.date,
  expiresAt:
    typeof patch.expiresAt === "object" && patch.expiresAt instanceof Date
      ? patch.expiresAt.toISOString()
      : patch.expiresAt,
  meta:
    patch.meta && !Array.isArray(patch.meta)
      ? recordToMetaEntries(patch.meta)
      : patch.meta,
});

const collectNoteAndDescendantIds = (
  queryClient: QueryClient,
  noteId: string,
) => {
  const removedIds = new Set([noteId]);
  const childrenByParentId = new Map<string, string[]>();

  getCachedNoteListQueryKeys(queryClient).forEach((queryKey) => {
    const notes = queryClient.getQueryData<Note[]>(queryKey) ?? [];
    notes.forEach((note) => {
      if (!hasParentId(note.parentId)) return;

      const children = childrenByParentId.get(note.parentId) ?? [];
      childrenByParentId.set(note.parentId, [...children, note._id]);
    });
  });

  const queue = [noteId];
  while (queue.length > 0) {
    const parentId = queue.shift();
    if (!parentId) continue;

    const childIds = childrenByParentId.get(parentId) ?? [];
    childIds.forEach((childId) => {
      if (removedIds.has(childId)) return;
      removedIds.add(childId);
      queue.push(childId);
    });
  }

  return removedIds;
};

export const patchNoteInCachedLists = (
  queryClient: QueryClient,
  noteId: string,
  patch: NoteCachePatch,
) => {
  const normalizedPatch = normalizeNotePatch(patch);

  queryClient
    .getQueryCache()
    .findAll({ queryKey: noteKeys.lists })
    .forEach((query) => {
      if (!isNoteListQueryKey(query.queryKey)) return;

      queryClient.setQueryData<Note[]>(query.queryKey, (old) => {
        if (!old) return old;

        return old.map((note) =>
          note._id === noteId ? ({ ...note, ...normalizedPatch } as Note) : note,
        );
      });
    });
};

export const patchNoteDetailCache = (
  queryClient: QueryClient,
  noteId: string,
  patch: NoteCachePatch,
) => {
  const normalizedPatch = normalizeNotePatch(patch);

  queryClient.setQueryData<NoteWithContent>(noteKeys.detail(noteId), (old) =>
    old ? { ...old, ...normalizedPatch } : old,
  );
};

export const patchRecentNotesCache = (
  queryClient: QueryClient,
  noteId: string,
  patch: NoteCachePatch,
) => {
  const normalizedPatch = normalizeNotePatch(patch);

  queryClient.setQueryData<Note[]>(noteKeys.recent(), (old) => {
    if (!old) return old;

    const patchedNote = old.find((note) => note._id === noteId);
    if (!patchedNote) return old;

    const nextNote = { ...patchedNote, ...normalizedPatch } as Note;
    return [nextNote, ...old.filter((note) => note._id !== noteId)];
  });
};

export const patchNoteAncestorsCache = (
  queryClient: QueryClient,
  noteId: string,
  patch: NoteCachePatch,
) => {
  queryClient
    .getQueryCache()
    .findAll({ queryKey: noteKeys.ancestorsRoot })
    .forEach((query) => {
      queryClient.setQueryData<NotePathItem[]>(query.queryKey, (old) =>
        old?.map((note) =>
          note._id === noteId ? { ...note, ...patch } : note,
        ),
      );
    });
};

export const patchNoteAcrossCaches = (
  queryClient: QueryClient,
  noteId: string,
  patch: NoteCachePatch,
) => {
  patchNoteInCachedLists(queryClient, noteId, patch);
  patchNoteDetailCache(queryClient, noteId, patch);
  patchRecentNotesCache(queryClient, noteId, patch);
  patchNoteAncestorsCache(queryClient, noteId, patch);
};

export const applyOptimisticNoteContentUpdate = async (
  queryClient: QueryClient,
  noteId: string,
  content: string,
): Promise<NoteContentSnapshot> => {
  const detailQueryKey = noteKeys.detail(noteId);
  const recentNoteQueryKey = noteKeys.recent();
  const updatedAt = new Date().toISOString();

  await queryClient.cancelQueries({ queryKey: detailQueryKey });
  await queryClient.cancelQueries({ queryKey: recentNoteQueryKey });

  const previousDetail = queryClient.getQueryData<NoteWithContent>(detailQueryKey);
  const previousRecentNotes = queryClient.getQueryData<Note[]>(recentNoteQueryKey);

  const currentStatus = previousDetail?.status;
  const statusPatch = currentStatus === "inbox" ? { status: "active" as const } : {};

  patchNoteDetailCache(queryClient, noteId, { content, updatedAt, ...statusPatch });
  patchRecentNotesCache(queryClient, noteId, { updatedAt, ...statusPatch });

  return { previousDetail, previousRecentNotes };
};

export const rollbackOptimisticNoteContentUpdate = (
  queryClient: QueryClient,
  noteId: string,
  snapshot?: NoteContentSnapshot,
) => {
  if (!snapshot) return;

  if (snapshot.previousDetail) {
    queryClient.setQueryData(noteKeys.detail(noteId), snapshot.previousDetail);
  }
  if (snapshot.previousRecentNotes) {
    queryClient.setQueryData(noteKeys.recent(), snapshot.previousRecentNotes);
  }
};

export const applySuccessfulNoteContentUpdate = (
  queryClient: QueryClient,
  noteId: string,
  note?: NoteWithContent,
) => {
  if (note) {
    patchNoteAcrossCaches(queryClient, noteId, note);
  }

  queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
};

export const optimisticPrependNoteToList = async (
  queryClient: QueryClient,
  scope: NoteListScope,
  note: NoteWithContent,
): Promise<NoteListSnapshot> => {
  if (!canResolveNoteListScope(scope)) {
    return { canPatch: false, scope };
  }

  const queryKey = noteListQueryKey(scope);
  await Promise.all([
    queryClient.cancelQueries({ queryKey }),
    queryClient.cancelQueries({ queryKey: noteKeys.allLists }),
    queryClient.cancelQueries({ queryKey: noteKeys.recent() }),
  ]);
  const recentNotes = queryClient.getQueryData<Note[]>(noteKeys.recent());
  const cacheQueryKeys = getUniqueQueryKeys([
    queryKey,
    ...getCachedAllNoteListQueryKeys(queryClient),
    ...(recentNotes === undefined ? [] : [noteKeys.recent()]),
  ]);
  const caches = getNoteListSnapshots(queryClient, cacheQueryKeys);
  const previousNotes = queryClient.getQueryData<Note[]>(queryKey);
  const hadPreviousData = previousNotes !== undefined;

  queryClient.setQueryData<Note[]>(queryKey, (old = []) =>
    prependUniqueNote(old as Note[], note),
  );
  getCachedAllNoteListQueryKeys(queryClient).forEach((allListQueryKey) => {
    queryClient.setQueryData<Note[]>(allListQueryKey, (old) =>
      old ? prependUniqueNote(old, note) : old,
    );
  });
  queryClient.setQueryData<Note[]>(noteKeys.recent(), (old) =>
    old ? prependUniqueNote(old, note) : old,
  );

  return {
    caches,
    canPatch: true,
    hadPreviousData,
    previousNotes,
    queryKey,
    scope,
  };
};

export const optimisticRemoveNoteFromList = async (
  queryClient: QueryClient,
  scope: NoteListScope,
  noteId: string,
): Promise<NoteListSnapshot> => {
  if (!canResolveNoteListScope(scope)) {
    return { canPatch: false, scope };
  }

  const removedIds = collectNoteAndDescendantIds(queryClient, noteId);
  const queryKey = noteListQueryKey(scope);
  await Promise.all([
    queryClient.cancelQueries({ queryKey: noteKeys.lists }),
    queryClient.cancelQueries({ queryKey: noteKeys.recent() }),
  ]);
  const recentNotes = queryClient.getQueryData<Note[]>(noteKeys.recent());
  const cacheQueryKeys = getUniqueQueryKeys([
    ...getCachedNoteListQueryKeys(queryClient),
    ...(recentNotes === undefined ? [] : [noteKeys.recent()]),
  ]);
  const caches = getNoteListSnapshots(queryClient, cacheQueryKeys);
  const previousNotes = queryClient.getQueryData<Note[]>(queryKey);
  const hadPreviousData = previousNotes !== undefined;

  cacheQueryKeys.forEach((cachedQueryKey) => {
    queryClient.setQueryData<Note[]>(cachedQueryKey, (old) =>
      old ? old.filter((note) => !removedIds.has(note._id)) : old,
    );
  });

  return {
    caches,
    canPatch: true,
    hadPreviousData,
    previousNotes,
    queryKey,
    scope,
  };
};

export const rollbackNoteListSnapshot = (
  queryClient: QueryClient,
  snapshot?: NoteListSnapshot,
) => {
  if (!snapshot?.canPatch || !snapshot.queryKey) {
    return;
  }

  if (snapshot.caches) {
    snapshot.caches.forEach((cache) => {
      if (!cache.hadPreviousData) {
        queryClient.removeQueries({ exact: true, queryKey: cache.queryKey });
        return;
      }

      queryClient.setQueryData(cache.queryKey, cache.previousNotes);
    });
    return;
  }

  if (!snapshot.hadPreviousData) {
    queryClient.removeQueries({ exact: true, queryKey: snapshot.queryKey });
    return;
  }

  queryClient.setQueryData(snapshot.queryKey, snapshot.previousNotes);
};

export const replaceNoteInListCache = (
  queryClient: QueryClient,
  scope: NoteListScope,
  note: NoteWithContent,
) => {
  if (!canResolveNoteListScope(scope)) return;

  queryClient.setQueryData<Note[]>(noteListQueryKey(scope), (old = []) =>
    (old as Note[]).map((cachedNote) =>
      cachedNote._id === note._id ? { ...cachedNote, ...note } : cachedNote,
    ),
  );
};

export const applyOptimisticNotePropertiesUpdate = async (
  queryClient: QueryClient,
  { noteId, properties, parentId, owner }: UpdateNotePropertiesVariables,
): Promise<NotePropertiesSnapshot> => {
  const currentScope = getNoteListScope({ parentId, owner });
  const nextParentId = Object.prototype.hasOwnProperty.call(properties, "parentId")
    ? properties.parentId
    : parentId;
  const nextScope = getNoteListScope({ parentId: nextParentId, owner });
  const canPatchCurrentList = canResolveNoteListScope(currentScope);
  const canPatchNextList = canResolveNoteListScope(nextScope);
  const currentQueryKey = noteListQueryKey(currentScope);
  const nextQueryKey = noteListQueryKey(nextScope);
  const detailQueryKey = noteKeys.detail(noteId);
  const recentNoteQueryKey = noteKeys.recent();

  if (canPatchCurrentList) {
    await queryClient.cancelQueries({ queryKey: currentQueryKey });
  }
  if (canPatchNextList && !sameQueryKey(currentQueryKey, nextQueryKey)) {
    await queryClient.cancelQueries({ queryKey: nextQueryKey });
  }
  await queryClient.cancelQueries({ queryKey: detailQueryKey });
  await queryClient.cancelQueries({ queryKey: recentNoteQueryKey });

  const previousNotes = canPatchCurrentList
    ? queryClient.getQueryData<Note[]>(currentQueryKey)
    : undefined;
  const previousNextNotes = canPatchNextList
    ? queryClient.getQueryData<Note[]>(nextQueryKey)
    : undefined;
  const previousDetail =
    queryClient.getQueryData<NoteWithContent>(detailQueryKey);
  const previousRecentNotes =
    queryClient.getQueryData<Note[]>(recentNoteQueryKey);
  const currentNote =
    previousNotes?.find((note) => note._id === noteId) ??
    previousDetail ??
    null;
  const nextNote =
    currentNote == null
      ? null
      : ({
          ...currentNote,
          ...properties,
          parentId: nextParentId ?? null,
        } as NoteWithContent);

  if (parentId !== nextParentId) {
    if (canPatchCurrentList) {
      queryClient.setQueryData<Note[]>(currentQueryKey, (old = []) =>
        (old as Note[]).filter((note: Note) => note._id !== noteId),
      );
    }
    if (nextNote && canPatchNextList) {
      queryClient.setQueryData<Note[]>(nextQueryKey, (old = []) => {
        const nextList = (old as Note[]).filter((note) => note._id !== noteId);
        return [nextNote, ...nextList];
      });
    }
  }

  patchNoteAcrossCaches(queryClient, noteId, {
    ...properties,
    parentId: nextParentId ?? null,
  });

  return {
    canPatchCurrentList,
    canPatchNextList,
    currentScope,
    nextParentId,
    nextScope,
    previousDetail,
    previousNextNotes,
    previousNotes,
    previousRecentNotes,
  };
};

export const rollbackOptimisticNotePropertiesUpdate = (
  queryClient: QueryClient,
  variables: UpdateNotePropertiesVariables,
  snapshot?: NotePropertiesSnapshot,
) => {
  if (!snapshot) return;

  if (snapshot.previousNotes && snapshot.canPatchCurrentList) {
    queryClient.setQueryData(
      noteListQueryKey(snapshot.currentScope),
      snapshot.previousNotes,
    );
  }
  if (snapshot.previousNextNotes && snapshot.canPatchNextList) {
    queryClient.setQueryData(
      noteListQueryKey(snapshot.nextScope),
      snapshot.previousNextNotes,
    );
  }
  if (snapshot.previousDetail) {
    queryClient.setQueryData(
      noteKeys.detail(variables.noteId),
      snapshot.previousDetail,
    );
  }
  if (snapshot.previousRecentNotes) {
    queryClient.setQueryData(noteKeys.recent(), snapshot.previousRecentNotes);
  }
};

export const invalidateNotePropertiesUpdate = (
  queryClient: QueryClient,
  snapshot: NotePropertiesSnapshot,
) => {
  const currentQueryKey = noteListQueryKey(snapshot.currentScope);
  const nextQueryKey = noteListQueryKey(snapshot.nextScope);

  invalidateNoteListQuery(queryClient, snapshot.currentScope);
  if (!sameQueryKey(currentQueryKey, nextQueryKey)) {
    invalidateNoteListQuery(queryClient, snapshot.nextScope);
  }
  queryClient.invalidateQueries({ queryKey: noteKeys.ancestorsRoot });
  queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
  queryClient.invalidateQueries({ queryKey: noteKeys.allLists });
};
