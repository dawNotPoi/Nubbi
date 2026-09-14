import {
  recordToMetaEntries,
  type Note,
  type NoteWithContent,
  type UpdateNoteContentResult,
} from "@/api/note";
import type { QueryClient } from "@tanstack/react-query";
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
  parentId: string | null | undefined,
  noteId: string,
  patch: NoteCachePatch,
) => {
  const listPatch = withoutContent(normalizeNotePatch(patch));
  queryClient.setQueryData<Note[]>(noteKeys.tree(parentId ?? null), (old) =>
    old?.map((note) =>
      note._id === noteId ? ({ ...note, ...listPatch } as Note) : note,
    ),
  );
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

export const patchNoteAcrossCaches = (
  queryClient: QueryClient,
  parentId: string | null | undefined,
  noteId: string,
  patch: NoteCachePatch,
) => {
  patchNoteTreeCache(queryClient, parentId, noteId, patch);
  patchNoteDetailCache(queryClient, noteId, patch);
};

export const replaceNoteInTreeCache = (
  queryClient: QueryClient,
  parentId: string | null | undefined,
  note: Note,
) => {
  const listNote = withoutContent(note) as Note;
  queryClient.setQueryData<Note[]>(noteKeys.tree(parentId ?? null), (old) =>
    old?.map((cachedNote) =>
      cachedNote._id === note._id ? { ...cachedNote, ...listNote } : cachedNote,
    ),
  );
};

export const applyOptimisticNoteContentUpdate = async (
  queryClient: QueryClient,
  noteId: string,
) => {
  const detailKey = noteKeys.detail(noteId);
  await queryClient.cancelQueries({ queryKey: detailKey });
  const detail = queryClient.getQueryData<NoteWithContent>(detailKey);
  const statusPatch =
    detail?.status === "inbox" ? { status: "active" as const } : {};

  patchNoteDetailCache(queryClient, noteId, {
    updatedAt: new Date().toISOString(),
    ...statusPatch,
  });
};

export const applySuccessfulNoteContentUpdate = (
  queryClient: QueryClient,
  noteId: string,
  result?: UpdateNoteContentResult,
) => {
  if (result?.note) {
    patchNoteDetailCache(queryClient, noteId, result.note);
  }
  queryClient.invalidateQueries({ queryKey: noteKeys.allLists });
  queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
};
