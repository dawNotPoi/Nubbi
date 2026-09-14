import { httpError } from "@/common/http-error";
import note, {
  type NoteDocument,
  type NoteEntity,
} from "@/models/note";
import mongoose, { type Types } from "mongoose";
import { withNoteStructureLock } from "@/services/note/structure-lock";
import { assertNotesNotPendingPurge } from "./access";
import { normalizeMetaEntries, type MetaEntry } from "./note-meta";

type NoteSource = NonNullable<NoteEntity["source"]>;
type NoteStatus = NonNullable<NoteEntity["status"]>;

export type CreateNoteInput = {
  _id?: string;
  userId: string;
  title?: NoteEntity["title"];
  content?: NoteEntity["content"];
  parentId?: string | null;
  author?: NoteEntity["author"];
  tags?: NoteEntity["tags"];
  cover?: NoteEntity["cover"];
  password?: NoteEntity["password"];
  date?: NoteEntity["date"];
  expiresAt?: NoteEntity["expiresAt"];
  source?: NoteSource;
  // 内部调用方可以声明预期状态，但创建时仍以下方根据 source 推导的初始状态为准。
  status?: NoteStatus;
  meta?: unknown;
};

type CreateNoteData = {
  _id?: Types.ObjectId;
  userId: string;
  title?: NoteEntity["title"];
  content?: NoteEntity["content"];
  parentId?: string | null;
  author?: NoteEntity["author"];
  tags: NonNullable<NoteEntity["tags"]>;
  cover?: NoteEntity["cover"];
  password?: NoteEntity["password"];
  date?: NoteEntity["date"];
  expiresAt?: NoteEntity["expiresAt"];
  source: NoteSource;
  status: NoteStatus;
  meta: MetaEntry[];
};

const resolveInitialStatus = (source?: NoteSource): NoteStatus =>
  source === "agent" ? "inbox" : "active";

const createNoteUnlocked = async (req: CreateNoteInput) => {
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
  if (noteData._id) {
    await assertNotesNotPendingPurge(noteData.userId, [
      String(noteData._id),
    ]);
  }

  if (noteData.parentId) {
    const parent = await note
      .findOne({
        _id: noteData.parentId,
        userId: noteData.userId,
        deletedAt: null,
      })
      .select("_id")
      .lean();
    if (!parent) {
      throw httpError(404, "Parent note not found");
    }
  }

  const createdNote = await note.create(noteData);

  if (createdNote.parentId) {
    await note.findOneAndUpdate(
      { _id: createdNote.parentId, userId: noteData.userId },
      { $set: { hasChildren: true } },
    );
  }

  return createdNote;
};

export const createNote = async (
  req: CreateNoteInput,
): Promise<NoteDocument> =>
  withNoteStructureLock(String(req.userId), () => createNoteUnlocked(req));

const duplicateNoteUnlocked = async (
  noteId: string,
  userId: string,
  newParentId: string | null = null,
) => {
  const originalNote = await note.findOne({
    _id: noteId,
    userId,
    deletedAt: null,
  });
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
    await note.findOneAndUpdate(
      { _id: newParentId, userId },
      { $set: { hasChildren: true } },
    );
  }

  return createdNote;
};

export const duplicateNote = async (
  noteId: string,
  userId: string,
  newParentId: string | null = null,
): Promise<NoteDocument> =>
  withNoteStructureLock(userId, () =>
    duplicateNoteUnlocked(noteId, userId, newParentId),
  );
