import note from "@/models/note";
import mongoose from "mongoose";

const stripSummaryFromMeta = <T extends { meta?: unknown }>(value: T): T => {
  if (!value.meta || typeof value.meta !== "object" || Array.isArray(value.meta)) {
    return value;
  }

  const { summary: _summary, ...meta } = value.meta as Record<string, unknown>;
  return { ...value, meta };
};

export const createNote = async (req) => {
  const noteData = stripSummaryFromMeta({ ...req });
  if (noteData._id) {
    try {
      noteData._id = new mongoose.mongo.ObjectId("" + noteData._id);
    } catch (e) {
      delete noteData._id;
    }
  }
  return note.create(noteData).then((data) => {
    return data;
  });
};

export const duplicateNote = async (noteId: string, newParentId = null) => {
  const originalNote = await note.findById(noteId);
  if (!originalNote) {
    throw new Error("Note not found");
  }

  const duplicatedNote = stripSummaryFromMeta({
    ...originalNote.toObject(),
    _id: undefined,
    title: `${originalNote.title} (copy)`,
    parentId: newParentId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  delete duplicatedNote._id;
  return await note.create(duplicatedNote);
};
