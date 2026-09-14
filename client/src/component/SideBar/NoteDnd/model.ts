import type { Note } from "@/api/note";
import { createContext, useContext } from "react";

export const TRASH_DROP_ID = "note-dnd:trash";
export const ROOT_HEADER_DROP_ID = "note-dnd:root-header";
export const ROOT_FOOTER_DROP_ID = "note-dnd:root-footer";

export const noteDragId = (noteId: string) => `note-dnd:drag:${noteId}`;
export const noteDropId = (noteId: string) => `note-dnd:note:${noteId}`;

export type NoteDragData = { type: "note"; note: Note };
export type NoteDropData =
  | { type: "note"; note: Note }
  | { type: "root" }
  | { type: "trash" };

export type NoteDndState = {
  activeNote: Note | null;
  blockedIds: Set<string>;
};

export const IDLE_NOTE_DND_STATE: NoteDndState = {
  activeNote: null,
  blockedIds: new Set<string>(),
};

export const NoteDndContext = createContext<NoteDndState>(
  IDLE_NOTE_DND_STATE,
);

export const useNoteDndState = (): NoteDndState => useContext(NoteDndContext);
