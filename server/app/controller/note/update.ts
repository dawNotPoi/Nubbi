import { httpError } from "@/common/http-error";
import note, {
  type NoteDocument,
  type NoteEntity,
} from "@/models/note";
import type { FilterQuery } from "mongoose";
import {
  normalizeNoteProperties,
  type NotePropertiesInput,
} from "./note-properties";
import { moveNote } from "./structure-update";

export type { NotePropertiesInput } from "./note-properties";

export type UpdateNoteInput = {
  userId: string;
  _id: string;
  config: NotePropertiesInput;
};

export const updateNote = async (
  req: UpdateNoteInput,
): Promise<NoteDocument> => {
  return await updateNoteMeta(req.userId, req._id, req.config);
};

export type UpdateNoteContentOptions = {
  baseContentRevision?: number;
  clientMutationId?: string;
};

export type UpdateNoteContentResult = {
  accepted: boolean;
  clientMutationId?: string;
  conflict?: {
    serverContentRevision: number;
  };
  note: NoteDocument | null;
};

export const updateNoteContent = async (
  userId: string,
  noteId: string,
  content: string,
  options: UpdateNoteContentOptions = {},
): Promise<UpdateNoteContentResult> => {
  const hasBaseRevision = typeof options.baseContentRevision === "number";
  const existingNote = await note
    .findOne({ _id: noteId, userId, deletedAt: null })
    .select("contentRevision status")
    .lean();

  if (!existingNote) {
    throw httpError(404, "Note not found");
  }

  const serverContentRevision = existingNote.contentRevision ?? 0;

  if (
    hasBaseRevision &&
    options.baseContentRevision !== serverContentRevision
  ) {
    const currentNote = await note.findOne({ _id: noteId, userId });

    return {
      accepted: false,
      clientMutationId: options.clientMutationId,
      conflict: { serverContentRevision },
      note: currentNote,
    };
  }

  const updateFilter: FilterQuery<NoteEntity> = {
    _id: noteId,
    userId,
    deletedAt: null,
  };

  if (hasBaseRevision) {
    if (options.baseContentRevision === 0) {
      updateFilter.$or = [
        { contentRevision: 0 },
        { contentRevision: { $exists: false } },
      ];
    } else {
      updateFilter.contentRevision = options.baseContentRevision;
    }
  }

  const updatedNote = await note.findOneAndUpdate(
    updateFilter,
    {
      $inc: { contentRevision: 1 },
      $set: {
        content,
        ...(existingNote.status === "inbox" ? { status: "active" } : {}),
      },
    },
    { new: true },
  );

  if (!updatedNote) {
    const currentNote = await note.findOne({
      _id: noteId,
      userId,
      deletedAt: null,
    });

    return {
      accepted: false,
      clientMutationId: options.clientMutationId,
      conflict: {
        serverContentRevision: currentNote?.contentRevision ?? 0,
      },
      note: currentNote,
    };
  }

  return {
    accepted: true,
    clientMutationId: options.clientMutationId,
    note: updatedNote,
  };
};

export const updateNoteMeta = async (
  userId: string,
  noteId: string,
  properties: NotePropertiesInput,
): Promise<NoteDocument> => {
  const nextProperties = normalizeNoteProperties(properties);

  if (Object.prototype.hasOwnProperty.call(nextProperties, "parentId")) {
    const { parentId, ...propertiesToUpdate } = nextProperties;
    return await moveNote(
      userId,
      noteId,
      parentId as string | null,
      propertiesToUpdate,
    );
  }

  const updatedNote = await note.findOneAndUpdate(
    { _id: noteId, userId, deletedAt: null },
    {
      $set: {
        ...nextProperties,
      },
    },
    { new: true },
  );

  if (!updatedNote) throw httpError(404, "Note not found");
  return updatedNote;
};

export const publishNote = async (
  userId: string,
  noteId: string,
  published: boolean,
): Promise<NoteDocument> => {
  const updatedNote = await note.findOneAndUpdate(
    { _id: noteId, userId, deletedAt: null },
    { $set: { published } },
    { new: true },
  );

  if (!updatedNote) throw httpError(404, "Note not found");
  return updatedNote;
};
