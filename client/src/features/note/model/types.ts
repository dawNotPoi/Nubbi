import type { NoteWithContent, updateNoteProperties } from "@/api/note";

export type NotePropertiesInput = Parameters<typeof updateNoteProperties>[1];

export type CreateNoteVariables = {
  note: NoteWithContent;
  owner?: string;
};

export type DeleteNoteVariables = {
  noteId: string;
  parentId?: string | null;
  owner?: string;
};

export type UpdateNotePropertiesVariables = {
  noteId: string;
  properties: NotePropertiesInput;
  parentId?: string | null;
  owner?: string;
};

export type PatchNoteCacheVariables = {
  noteId: string;
  properties: Partial<NoteWithContent>;
};

export type NoteSaveStatus = "idle" | "saving" | "saved";
