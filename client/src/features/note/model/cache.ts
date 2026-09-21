import {
  recordToMetaEntries,
  type Note,
  type NoteWithContent,
  type UpdateNoteContentResult,
} from "@/api/note";
import type { QueryClient } from "@tanstack/react-query";
import {
  assertAccountScopeCurrent,
  type AccountScope,
} from "@/features/auth/model/account-scope";
import { noteKeys } from "./keys";

type NoteCachePatch = Omit<
  Partial<NoteWithContent>,
  "date" | "expiresAt" | "meta"
> & {
  date?: string | Date;
  expiresAt?: string | Date | null;
  meta?: NoteWithContent["meta"] | Record<string, unknown>;
};

const normalizeNotePatch = (
  patch: NoteCachePatch,
): Partial<NoteWithContent> => {
  const { date, expiresAt, meta, ...restPatch } = patch;
  const normalizedPatch: Partial<NoteWithContent> = { ...restPatch };

  if (Object.prototype.hasOwnProperty.call(patch, "date")) {
    normalizedPatch.date = date instanceof Date ? date.toISOString() : date;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "expiresAt")) {
    normalizedPatch.expiresAt =
      expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "meta")) {
    normalizedPatch.meta =
      meta && !Array.isArray(meta) ? recordToMetaEntries(meta) : meta;
  }

  return normalizedPatch;
};

const withoutContent = <T extends Partial<NoteWithContent>>(value: T) => {
  const nextValue = { ...value };
  delete nextValue.content;
  return nextValue;
};

export const patchNoteTreeCache = (
  queryClient: QueryClient,
  ownerId: string,
  parentId: string | null | undefined,
  noteId: string,
  patch: NoteCachePatch,
) => {
  const listPatch = withoutContent(normalizeNotePatch(patch));
  queryClient.setQueryData<Note[]>(noteKeys.tree(ownerId, parentId ?? null), (old) =>
    old?.map((note) =>
      note._id === noteId ? ({ ...note, ...listPatch } as Note) : note,
    ),
  );
};

export const patchNoteDetailCache = (
  queryClient: QueryClient,
  ownerId: string,
  noteId: string,
  patch: NoteCachePatch,
) => {
  const normalizedPatch = normalizeNotePatch(patch);
  queryClient.setQueryData<NoteWithContent>(noteKeys.detail(ownerId, noteId), (old) =>
    old ? { ...old, ...normalizedPatch } : old,
  );
};

export const patchNoteAcrossCaches = (
  queryClient: QueryClient,
  ownerId: string,
  parentId: string | null | undefined,
  noteId: string,
  patch: NoteCachePatch,
) => {
  patchNoteTreeCache(queryClient, ownerId, parentId, noteId, patch);
  patchNoteDetailCache(queryClient, ownerId, noteId, patch);
};

export const replaceNoteInTreeCache = (
  queryClient: QueryClient,
  ownerId: string,
  parentId: string | null | undefined,
  note: Note,
) => {
  const listNote = withoutContent(note) as Note;
  queryClient.setQueryData<Note[]>(noteKeys.tree(ownerId, parentId ?? null), (old) =>
    old?.map((cachedNote) =>
      cachedNote._id === note._id ? { ...cachedNote, ...listNote } : cachedNote,
    ),
  );
};

export const applyOptimisticNoteContentUpdate = async (
  queryClient: QueryClient,
  scope: AccountScope,
  noteId: string,
) => {
  const { ownerId } = scope;
  const detailKey = noteKeys.detail(ownerId, noteId);
  await queryClient.cancelQueries({ queryKey: detailKey });
  assertAccountScopeCurrent(scope);
  const detail = queryClient.getQueryData<NoteWithContent>(detailKey);
  const statusPatch =
    detail?.status === "inbox" ? { status: "active" as const } : {};

  patchNoteDetailCache(queryClient, ownerId, noteId, {
    updatedAt: new Date().toISOString(),
    ...statusPatch,
  });
};

export const applySuccessfulNoteContentUpdate = (
  queryClient: QueryClient,
  ownerId: string,
  noteId: string,
  result?: UpdateNoteContentResult,
) => {
  if (result?.note) {
    patchNoteDetailCache(queryClient, ownerId, noteId, result.note);
  }
  queryClient.invalidateQueries({ queryKey: noteKeys.allLists(ownerId) });
  queryClient.invalidateQueries({ queryKey: noteKeys.recent(ownerId) });
};
