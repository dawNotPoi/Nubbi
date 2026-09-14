import { getUser } from "@/lib/authUser";
import { requireNotePermission } from "@/middleware/session";
import express from "express";
import { z } from "zod";
import { createNote } from "../controller/note/create";
import { deleteNote, purgeNote, restoreNote } from "../controller/note/delete";
import {
  getDirectChildren,
  getAllNotes,
  getNoteAncestors,
  getNoteById,
  getNotes,
  getRecentNotes,
  getRootNotes,
  getTrashNotes,
  searchNotes,
  validateNoteMoveTarget,
  validateNoteUser,
} from "../controller/note/query";
import {
  publishNote,
  updateNoteContent,
  updateNoteMeta,
} from "../controller/note/update";
import { syncUserTags } from "../controller/tag";
import { asyncHandler } from "../middleware/common";
import { validate, validateQuery } from "../middleware/validator";
import { successResponse } from "./utils";
import { withNoteStructureLock } from "@/controller/note/structureLock";

const router = express.Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");
const noteStatusSchema = z.enum(["inbox", "active", "archived"]);
const trashQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(500),
  offset: z.coerce.number().int().nonnegative().default(0),
});
const metaEntrySchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  type: z.string().default("text"),
});
const metaSchema = z.union([z.array(metaEntrySchema), z.record(z.any())]);

const getSingleQueryValue = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const assertCanAccessNote = async (
  userId: string,
  noteId: string,
  options: { includeDeleted?: boolean } = {},
) => {
  if (!(await validateNoteUser(userId, noteId, options))) {
    throw Object.assign(new Error("Note not found"), { status: 404 });
  }
};

router.post(
  "/create",
  requireNotePermission("create"),
  validate(
    z.object({
      _id: objectIdSchema.optional(),
      title: z.string().optional(),
      content: z.string().optional(),
      parentId: objectIdSchema.nullable().optional(),
      source: z.enum(["user", "agent"]).optional(),
      author: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      cover: z.string().optional(),
      password: z.string().nullable().optional(),
      date: z.coerce.date().optional(),
      expiresAt: z.coerce.date().nullable().optional(),
      meta: metaSchema.optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    if (req.body.parentId) {
      await assertCanAccessNote(id, req.body.parentId);
    }

    const result = await createNote({ ...req.body, userId: id });
    await syncUserTags(id, req.body.tags);
    successResponse(res, result, "create success");
  }),
);

router.put(
  "/content",
  requireNotePermission("update"),
  validate(
    z.object({
      noteId: objectIdSchema,
      content: z.string(),
      baseContentRevision: z.number().int().nonnegative().optional(),
      clientMutationId: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { baseContentRevision, clientMutationId, noteId, content } = req.body;
    const user = await getUser(req);
    await assertCanAccessNote(user.id, noteId);

    const result = await updateNoteContent(noteId, content, {
      baseContentRevision,
      clientMutationId,
    });
    successResponse(res, result, "content updated");
  }),
);

router.put(
  "/properties",
  requireNotePermission("update"),
  validate(
    z.object({
      noteId: objectIdSchema,
      title: z.string().optional(),
      author: z.string().nullable().optional(),
      source: z.enum(["user", "agent"]).optional(),
      status: noteStatusSchema.optional(),
      published: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      parentId: objectIdSchema.nullable().optional(),
      meta: metaSchema.optional(),
      cover: z.string().optional(),
      password: z.string().nullable().optional(),
      date: z.coerce.date().optional(),
      expiresAt: z.coerce.date().nullable().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { noteId, ...properties } = req.body;
    const user = await getUser(req);
    await assertCanAccessNote(user.id, noteId);

    const hasParentChange = Object.prototype.hasOwnProperty.call(
      properties,
      "parentId",
    );
    const hasStructureChange =
      hasParentChange ||
      Object.prototype.hasOwnProperty.call(properties, "source");
    const applyUpdate = async () => {
      if (hasParentChange) {
        await assertCanAccessNote(user.id, noteId);
        if (!(await validateNoteMoveTarget({
          noteId,
          parentId: properties.parentId,
          userId: user.id,
        }))) {
          throw Object.assign(
            new Error("Cannot move note to itself or its descendant"),
            { status: 400 },
          );
        }
      }
      return updateNoteMeta(noteId, properties);
    };
    const result = hasStructureChange
      ? await withNoteStructureLock(user.id, applyUpdate)
      : await applyUpdate();
    await syncUserTags(user.id, properties.tags);
    successResponse(res, result, "properties updated");
  }),
);

router.put(
  "/publish",
  requireNotePermission("publish"),
  validate(
    z.object({
      noteId: objectIdSchema,
      published: z.boolean(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { noteId, published } = req.body;
    const user = await getUser(req);
    await assertCanAccessNote(user.id, noteId);

    const result = await publishNote(noteId, published);
    successResponse(res, result, "publish state updated");
  }),
);

router.put(
  "/restore",
  requireNotePermission("restore"),
  validate(
    z.object({
      noteId: objectIdSchema,
    }),
  ),
  asyncHandler(async (req, res) => {
    const { noteId } = req.body;
    const { id } = await getUser(req);
    await assertCanAccessNote(id, noteId, { includeDeleted: true });

    const result = await restoreNote(noteId, id);
    successResponse(res, result, "restore success");
  }),
);

router.get(
  "/all",
  requireNotePermission("read"),
  asyncHandler(async (req, res) => {
    const owner = await getUser(req);
    const result = await getAllNotes(owner.id);
    successResponse(res, result, "query success");
  }),
);

router.get(
  "/roots",
  requireNotePermission("read"),
  asyncHandler(async (req, res) => {
    const owner = await getUser(req);
    const result = await getRootNotes(owner.id);
    successResponse(res, result, "query success");
  }),
);

router.get(
  "/children",
  requireNotePermission("read"),
  validateQuery(
    z.object({
      parentId: objectIdSchema,
    }),
  ),
  asyncHandler(async (req, res) => {
    const parentId = getSingleQueryValue(req.query.parentId);
    if (!parentId) {
      throw Object.assign(new Error("parentId is required"), { status: 400 });
    }
    const user = await getUser(req);
    await assertCanAccessNote(user.id, parentId);

    const result = await getDirectChildren(parentId, user.id);
    successResponse(res, result, "query success");
  }),
);

router.get(
  "/ancestors",
  requireNotePermission("read"),
  validateQuery(
    z.object({
      noteId: objectIdSchema,
    }),
  ),
  asyncHandler(async (req, res) => {
    const noteId = getSingleQueryValue(req.query.noteId);
    if (!noteId) {
      throw Object.assign(new Error("noteId is required"), { status: 400 });
    }

    const { id } = await getUser(req);
    const result = await getNoteAncestors(noteId, id);
    successResponse(res, result, "query success");
  }),
);

router.get(
  "/detail",
  requireNotePermission("read"),
  validateQuery(
    z.object({
      noteId: objectIdSchema,
    }),
  ),
  asyncHandler(async (req, res) => {
    const noteId = getSingleQueryValue(req.query.noteId);
    if (!noteId) {
      throw Object.assign(new Error("noteId is required"), { status: 400 });
    }
    const user = await getUser(req);
    const result = await getNoteById(noteId, user.id);
    successResponse(res, result, "query success");
  }),
);

router.get(
  "/recent",
  requireNotePermission("read"),
  asyncHandler(async (req, res) => {
    const owner = await getUser(req);
    const result = await getRecentNotes(owner.id);
    successResponse(res, result, "query success");
  }),
);

router.get(
  "/trash",
  requireNotePermission("read"),
  validateQuery(trashQuerySchema),
  asyncHandler(async (req, res) => {
    const owner = await getUser(req);
    const input = trashQuerySchema.parse(req.query);
    const result = await getTrashNotes(owner.id, input);
    successResponse(res, result, "query success");
  }),
);

router.get(
  "/getNote",
  requireNotePermission("read"),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const result = await getNotes(user.id);
    successResponse(res, result, "query success");
  }),
);

router.post(
  "/search",
  requireNotePermission("read"),
  validate(
    z.object({
      title: z.string().trim().min(1).max(100),
    }),
  ),
  asyncHandler(async (req, res) => {
    const owner = await getUser(req);
    const { title } = req.body;
    const result = await searchNotes(owner.id, title);
    successResponse(res, result, "query success");
  }),
);

router.delete(
  "/delete",
  requireNotePermission("trash"),
  validate(
    z.object({
      noteId: objectIdSchema,
    }),
  ),
  asyncHandler(async (req, res) => {
    const { noteId } = req.body;
    const { id } = await getUser(req);
    await assertCanAccessNote(id, noteId);

    await deleteNote(noteId, id);
    successResponse(res, null, "delete success");
  }),
);

router.delete(
  "/purge",
  requireNotePermission("purge"),
  validate(
    z.object({
      noteId: objectIdSchema,
    }),
  ),
  asyncHandler(async (req, res) => {
    const { noteId } = req.body;
    const { id } = await getUser(req);
    await assertCanAccessNote(id, noteId, { includeDeleted: true });

    const result = await purgeNote(noteId, id);
    successResponse(res, result, "purge success");
  }),
);

export default router;
