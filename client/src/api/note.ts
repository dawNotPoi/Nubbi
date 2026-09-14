import { ObjectId } from "bson";
import request, { Get } from "./request";

export type NoteSource = "user" | "agent";
export type NoteStatus = "inbox" | "active" | "done" | "archived";

type ApiResponse<T> = Awaited<ReturnType<typeof request<T>>>;

export interface MetaEntry {
  key: string;
  value: unknown;
  type: string;
}

export interface Note {
  _id: string;
  title: string;
  parentId?: string | null;
  hasChildren: boolean;
  source: NoteSource;
  status: NoteStatus;
  published: boolean;
  tags: string[];
  author?: string | null;
  date?: string;
  deletedAt?: string | null;
  expiresAt?: string | null;
  cover: string;
  password?: string | null;
  meta: MetaEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchNote extends Note {
  pathLabel?: string;
}

export interface NotePathItem {
  _id: string;
  title: string;
}

export interface NoteWithContent extends Note {
  content?: string;
}

export type UpdateNotePropertiesInput = {
  title?: string;
  author?: string | null;
  source?: NoteSource;
  status?: NoteStatus;
  published?: boolean;
  tags?: string[];
  parentId?: string | null;
  meta?: MetaEntry[] | Record<string, unknown>;
  cover?: string;
  password?: string | null;
  date?: string | Date;
  expiresAt?: string | Date | null;
};

export const metaEntriesToRecord = (meta?: MetaEntry[]) =>
  (meta ?? []).reduce<Record<string, unknown>>((result, entry) => {
    result[entry.key] = entry.value;
    return result;
  }, {});

export const recordToMetaEntries = (
  meta?: Record<string, unknown>,
): MetaEntry[] =>
  Object.entries(meta ?? {}).map(([key, value]) => ({
    key,
    value,
    type: typeof value === "number" ? "number" : "text",
  }));

export const newNote = (
  note?: Partial<NoteWithContent>,
): NoteWithContent => ({
  _id: new ObjectId().toHexString(),
  title: "",
  parentId: null,
  hasChildren: false,
  source: "user",
  status: "active",
  published: false,
  tags: [],
  cover: "",
  content: "",
  meta: [],
  deletedAt: null,
  expiresAt: null,
  ...note,
});

const assertSuccess = <T>(response: ApiResponse<T>, fallback: string) => {
  if (response.code === 0) {
    throw new Error(response.message || fallback);
  }

  return response;
};

export async function createNote(data: NoteWithContent) {
  const response = await request<Note>("note/create", {
    ...data,
  });

  return assertSuccess(response, "Failed to create note");
}

export const getRootNotes = async () => {
  return Get<Note[]>("note/roots");
};

export const getAllNotes = async () => {
  return Get<Note[]>("note/all");
};

export const getRecentNotes = async () => {
  return Get<Note[]>("note/recent");
};

export const getTrashNotes = async () => {
  return Get<Note[]>("note/trash");
};

export const getDirectChildren = async (parentId: string) => {
  return Get<Note[]>("note/children", { parentId });
};

export async function updateNoteContent(noteId: string, content: string) {
  const response = await request<NoteWithContent>(
    "note/content",
    { noteId, content },
    "put",
  );

  return assertSuccess(response, "Failed to update note content");
}

export async function updateNoteProperties(
  noteId: string,
  properties: UpdateNotePropertiesInput,
) {
  const response = await request<Note>(
    "note/properties",
    { noteId, ...properties },
    "put",
  );

  return assertSuccess(response, "Failed to update note properties");
}

export async function publishNote(noteId: string, published: boolean) {
  const response = await request<Note>(
    "note/publish",
    { noteId, published },
    "put",
  );

  return assertSuccess(response, "Failed to update publish state");
}

export async function deleteNote(noteId: string) {
  const response = await request("note/delete", { noteId }, "delete");

  return assertSuccess(response, "Failed to delete note");
}

export async function restoreNote(noteId: string) {
  const response = await request<Note>("note/restore", { noteId }, "put");

  return assertSuccess(response, "Failed to restore note");
}

export async function purgeNote(noteId: string) {
  const response = await request<{ deletedCount: number }>(
    "note/purge",
    { noteId },
    "delete",
  );

  return assertSuccess(response, "Failed to purge note");
}

export async function getNoteDetail(noteId: string) {
  return Get<NoteWithContent>("note/detail", { noteId });
}

export async function getNoteAncestors(noteId: string) {
  return Get<NotePathItem[]>("note/ancestors", { noteId });
}

export async function searchNotes(title: string) {
  return request<SearchNote[]>("note/search", { title });
}
