import { getUser } from "@/lib/auth";
import requireAuth from "@/middleware/session";
import express from "express";
import { z } from "zod";
import { createNote } from "../controller/note/create";
import { deleteNote } from "../controller/note/delete";
import {
  getDirectChildren,
  getNoteAncestors,
  getNoteById,
  getNotes,
  getRecentNotes,
  getRootNotes,
  searchNotes,
  validateNoteUser,
} from "../controller/note/query";
import { updateNoteContent, updateNoteMeta } from "../controller/note/update";
import { asyncHandler } from "../middleware/common";
import { validate, validateQuery } from "../middleware/validator";
import { successResponse } from "./utils";

const router = express.Router();

const getSingleQueryValue = (value: unknown) =>
  typeof value === "string" ? value : undefined;

router.post(
  "/create",
  requireAuth,
  validate(
    z.object({
      title: z.string(),
      content: z.string().optional(),
      parentId: z.string().optional(),
      meta: z.record(z.any()).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    const noteData = req.body;
    const result = await createNote({ ...noteData, userId: id });
    successResponse(res, result, "创建成功");
  }),
);

router.put(
  "/content",
  requireAuth,
  validate(
    z.object({
      noteId: z.string().min(1, "笔记ID不能为空"),
      content: z.string(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { noteId, content } = req.body;
    const user = await getUser(req);
    if (!(await validateNoteUser(user.id, noteId))) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }
    const result = await updateNoteContent(noteId, content);
    successResponse(res, result, "内容更新成功");
  }),
);

router.put(
  "/properties",
  requireAuth,
  validate(
    z.object({
      noteId: z.string().min(1, "笔记ID不能为空"),
      title: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(["Draft", "Published", "Archived"]).optional(),
      parentId: z.string().nullable().optional(),
      meta: z.record(z.any()).optional(),
      cover: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { noteId, ...properties } = req.body;
    const user = await getUser(req);
    if (!(await validateNoteUser(user.id, noteId))) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }
    const result = await updateNoteMeta(noteId, properties);
    successResponse(res, result, "属性更新成功");
  }),
);

router.get(
  "/roots",
  asyncHandler(async (req, res) => {
    const owner = getSingleQueryValue(req.query.owner);
    if (!owner) {
      throw Object.assign(new Error("owner is required"), { status: 400 });
    }
    const result = await getRootNotes(owner);
    successResponse(res, result, "查询成功");
  }),
);

router.get(
  "/children",
  requireAuth,
  validateQuery(
    z.object({
      parentId: z.string().min(1, "父级ID不能为空"),
    }),
  ),
  asyncHandler(async (req, res) => {
    const parentId = getSingleQueryValue(req.query.parentId);
    if (!parentId) {
      throw Object.assign(new Error("parentId is required"), { status: 400 });
    }
    const result = await getDirectChildren(parentId);
    successResponse(res, result, "查询成功");
  }),
);

router.get(
  "/ancestors",
  requireAuth,
  validateQuery(
    z.object({
      noteId: z.string().min(1, "笔记ID不能为空"),
    }),
  ),
  asyncHandler(async (req, res) => {
    const noteId = getSingleQueryValue(req.query.noteId);
    if (!noteId) {
      throw Object.assign(new Error("noteId is required"), { status: 400 });
    }

    const { id } = await getUser(req);
    const result = await getNoteAncestors(noteId, id);
    successResponse(res, result, "查询成功");
  }),
);

router.get(
  "/detail",
  requireAuth,
  validateQuery(
    z.object({
      noteId: z.string().min(1, "笔记ID不能为空"),
    }),
  ),
  asyncHandler(async (req, res) => {
    const noteId = getSingleQueryValue(req.query.noteId);
    if (!noteId) {
      throw Object.assign(new Error("noteId is required"), { status: 400 });
    }
    const result = await getNoteById(noteId);
    successResponse(res, result, "查询成功");
  }),
);

router.delete(
  "/delete",
  requireAuth,
  validate(
    z.object({
      noteId: z.string().refine((val) => val.length > 0, "笔记ID不能为空"),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { noteId } = req.body;
    const { id } = await getUser(req);
    if (!(await validateNoteUser(id, noteId))) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }
    await deleteNote(noteId);
    successResponse(res, null, "删除成功");
  }),
);

router.get(
  "/getNote",
  asyncHandler(async (req, res) => {
    const userId = getSingleQueryValue(req.query.userId);
    if (!userId) {
      throw Object.assign(new Error("userId is required"), { status: 400 });
    }
    const result = await getNotes(userId);
    successResponse(res, result, "查询成功");
  }),
);

router.get(
  "/recent",
  requireAuth,
  asyncHandler(async (req, res) => {
    const owner = await getUser(req);
    const result = await getRecentNotes(owner.id);
    successResponse(res, result, "查询成功");
  }),
);

router.post(
  "/search",
  requireAuth,
  asyncHandler(async (req, res) => {
    const owner = await getUser(req);
    const { title } = req.body;
    const result = await searchNotes(owner.id, title);
    successResponse(res, result, "查询成功");
  }),
);

export default router;
