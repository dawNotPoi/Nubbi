import type { NoteWithContent, UpdateNotePropertiesInput } from "@/api/note";

export type NotePropertiesInput = UpdateNotePropertiesInput;

export type CreateNoteVariables = {
  note: NoteWithContent;
};

export type DeleteNoteVariables = {
  noteId: string;
  parentId: string | null | undefined;
};

export type UpdateNotePropertiesVariables = {
  noteId: string;
  parentId: string | null | undefined;
  properties: NotePropertiesInput;
};

export type UpdateNoteContentVariables = {
  baseContentRevision?: number;
  clientMutationId?: string;
  content: string;
  noteId: string;
};

export type PatchNoteCacheVariables = {
  noteId: string;
  parentId: string | null | undefined;
  properties: Partial<NoteWithContent>;
};

export type NoteSaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";
