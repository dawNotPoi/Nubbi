import note from "@/models/note";
import mongoose from "mongoose";

export type MetaEntry = {
  key: string;
  value: unknown;
  type: string;
};

type CreateNoteData = {
  _id?: mongoose.mongo.ObjectId;
  userId: unknown;
  title?: unknown;
  content?: unknown;
  parentId?: unknown;
  author?: unknown;
  tags: unknown[];
  cover?: unknown;
  password?: unknown;
  date?: unknown;
  expiresAt?: unknown;
  source: string;
  status: string;
  meta: MetaEntry[];
};

export const normalizeMetaEntries = (meta: unknown): MetaEntry[] => {
  if (!meta) return [];

  if (Array.isArray(meta)) {
    return meta
      .filter((entry) => entry && typeof entry === "object" && "key" in entry)
      .map((entry) => {
        const value = entry as Partial<MetaEntry>;
        return {
          key: String(value.key),
          value: value.value,
          type: value.type || "text",
        };
      });
  }

  if (typeof meta === "object") {
    return Object.entries(meta as Record<string, unknown>)
      .filter(([key]) => key !== "summary")
      .map(([key, value]) => ({
        key,
        value,
        type: typeof value === "number" ? "number" : "text",
      }));
  }

  return [];
};

const resolveInitialStatus = (source: unknown) =>
  source === "agent" ? "inbox" : "active";

export const createNote = async (req) => {
  const noteData: CreateNoteData = {
    userId: req.userId,
    title: req.title,
    content: req.content,
    parentId: req.parentId,
    author: req.author,
    tags: Array.isArray(req.tags) ? req.tags : [],
    cover: req.cover,
    password: req.password,
    date: req.date,
    expiresAt: req.expiresAt,
    source: req.source === "agent" ? "agent" : "user",
    status: resolveInitialStatus(req.source),
    meta: normalizeMetaEntries(req.meta),
  };

  if (req._id) {
    try {
      noteData._id = new mongoose.mongo.ObjectId(`${req._id}`);
    } catch {
      delete noteData._id;
    }
  }

  const createdNote = await note.create(noteData);

  if (createdNote.parentId) {
    await note.findByIdAndUpdate(createdNote.parentId, {
      $set: { hasChildren: true },
    });
  }

  return createdNote;
};

export const duplicateNote = async (
  noteId: string,
  userId: string,
  newParentId: string | null = null,
) => {
  const originalNote = await note.findOne({ _id: noteId, userId, deletedAt: null });
  if (!originalNote) {
    throw new Error("Note not found");
  }

  if (newParentId) {
    const parentNote = await note
      .findOne({ _id: newParentId, userId, deletedAt: null })
      .select("_id")
      .lean();

    if (!parentNote) {
      throw new Error("Parent note not found");
    }
  }

  const duplicatedNote = {
    ...originalNote.toObject(),
    _id: undefined,
    title: `${originalNote.title} (copy)`,
    parentId: newParentId,
    hasChildren: false,
    published: false,
    deletedAt: null,
    expiresAt: null,
    meta: JSON.parse(JSON.stringify(originalNote.meta ?? [])),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  delete duplicatedNote._id;
  const createdNote = await note.create(duplicatedNote);

  if (newParentId) {
    await note.findByIdAndUpdate(newParentId, {
      $set: { hasChildren: true },
    });
  }

  return createdNote;
};
