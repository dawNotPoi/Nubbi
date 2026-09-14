import mongoose from "@/lib/db";
import note from "@/models/note";
import type { ClientSession } from "mongoose";
import { normalizeMetaEntries } from "./create";

type NoteProperties = Record<string, unknown>;

const MUTABLE_FIELDS = new Set([
  "title",
  "author",
  "parentId",
  "source",
  "status",
  "published",
  "tags",
  "cover",
  "password",
  "date",
  "expiresAt",
  "meta",
]);

const sanitizeProperties = (properties: NoteProperties) => {
  const nextProperties: NoteProperties = {};

  Object.entries(properties).forEach(([key, value]) => {
    if (!MUTABLE_FIELDS.has(key)) return;
    nextProperties[key] = key === "meta" ? normalizeMetaEntries(value) : value;
  });

  return nextProperties;
};

const assertPublishInvariant = async (
  noteId: string,
  nextProperties: NoteProperties,
) => {
  if (
    !Object.prototype.hasOwnProperty.call(nextProperties, "published") &&
    !Object.prototype.hasOwnProperty.call(nextProperties, "status")
  ) {
    return true;
  }

  const existingNote = await note
    .findOne({ _id: noteId, deletedAt: null })
    .select("status published")
    .lean();

  if (!existingNote) return false;

  const nextStatus =
    typeof nextProperties.status === "string"
      ? nextProperties.status
      : existingNote.status;
  const nextPublished =
    typeof nextProperties.published === "boolean"
      ? nextProperties.published
      : existingNote.published;

  if (nextPublished && !["done", "archived"].includes(nextStatus)) {
    throw Object.assign(
      new Error("Only done or archived notes can be published"),
      { status: 400 },
    );
  }

  return true;
};

const recalculateHasChildren = async (
  parentId?: unknown,
  session?: ClientSession,
) => {
  if (!parentId) return;

  const childCount = await note
    .countDocuments({ parentId, deletedAt: null })
    .session(session ?? null);

  await note.findByIdAndUpdate(
    parentId,
    { $set: { hasChildren: childCount > 0 } },
    { session },
  );
};

const isTransactionUnsupported = (error: unknown) =>
  error instanceof Error &&
  /Transaction numbers|replica set|Transaction.*not supported/i.test(
    error.message,
  );

const runWithOptionalTransaction = async <T>(
  task: (session?: ClientSession) => Promise<T>,
) => {
  const session = await mongoose.startSession();

  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await task(session);
    });
    return result as T;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return await task();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

export const updateNote = async (req) => {
  return await updateNoteMeta(req._id, req.config);
};

type UpdateNoteContentOptions = {
  baseContentRevision?: number;
  clientMutationId?: string;
};

export const updateNoteContent = async (
  noteId: string,
  content: string,
  options: UpdateNoteContentOptions = {},
) => {
  const hasBaseRevision = typeof options.baseContentRevision === "number";
  const existingNote = await note
    .findOne({ _id: noteId, deletedAt: null })
    .select("contentRevision status")
    .lean();

  if (!existingNote) {
    return {
      accepted: false,
      clientMutationId: options.clientMutationId,
      conflict: undefined,
      note: null,
    };
  }

  const serverContentRevision = existingNote.contentRevision ?? 0;

  if (
    hasBaseRevision &&
    options.baseContentRevision !== serverContentRevision
  ) {
    const currentNote = await note.findById(noteId);

    return {
      accepted: false,
      clientMutationId: options.clientMutationId,
      conflict: { serverContentRevision },
      note: currentNote,
    };
  }

  const updateFilter: Record<string, unknown> = {
    _id: noteId,
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
    const currentNote = await note.findOne({ _id: noteId, deletedAt: null });

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
  noteId: string,
  properties: NoteProperties,
) => {
  const nextProperties = sanitizeProperties(properties);

  if (!(await assertPublishInvariant(noteId, nextProperties))) return null;

  if (Object.prototype.hasOwnProperty.call(nextProperties, "parentId")) {
    const { parentId, ...propertiesToUpdate } = nextProperties;
    return await moveNote(
      noteId,
      parentId as string | null,
      propertiesToUpdate,
    );
  }

  return await note.findOneAndUpdate(
    { _id: noteId, deletedAt: null },
    {
      $set: {
        ...nextProperties,
      },
    },
    { new: true },
  );
};

export const moveNote = async (
  noteId: string,
  newParentId?: string | null,
  propertiesToUpdate: NoteProperties = {},
) => {
  return await runWithOptionalTransaction(async (session) => {
    const existingNote = await note
      .findOne({ _id: noteId, deletedAt: null })
      .select("parentId")
      .session(session ?? null);

    if (!existingNote) return null;

    const oldParentId = existingNote.parentId;
    const updatedNote = await note.findByIdAndUpdate(
      noteId,
      {
        $set: { ...propertiesToUpdate, parentId: newParentId || null },
      },
      { new: true, session },
    );

    await recalculateHasChildren(oldParentId, session);

    if (newParentId) {
      await note.findByIdAndUpdate(
        newParentId,
        { $set: { hasChildren: true } },
        { session },
      );
    }

    return updatedNote;
  });
};

export const publishNote = async (noteId: string, published: boolean) => {
  const existingNote = await note
    .findOne({ _id: noteId, deletedAt: null })
    .select("status")
    .lean();

  if (!existingNote) return null;

  if (published && !["done", "archived"].includes(existingNote.status)) {
    throw Object.assign(
      new Error("Only done or archived notes can be published"),
      { status: 400 },
    );
  }

  return await note.findByIdAndUpdate(
    noteId,
    { $set: { published } },
    { new: true },
  );
};

export { recalculateHasChildren };
