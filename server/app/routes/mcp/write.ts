import { editMcpNoteContent } from "@/controller/mcp/noteContent";
import { createMcpNote } from "@/controller/mcp/noteCreate";
import {
  archiveMcpNote,
  moveMcpNote,
  restoreMcpNote,
  trashMcpNote,
} from "@/controller/mcp/noteLifecycle";
import { updateMcpNoteProperties } from "@/controller/mcp/noteProperties";
import { getUser } from "@/lib/authUser";
import { asyncHandler } from "@/middleware/common";
import { requireMcpNotePermission } from "@/middleware/session";
import { validate, validateParams } from "@/middleware/validator";
import express from "express";
import { successResponse } from "../utils";
import {
  archiveSchema,
  contentEditSchema,
  createNoteSchema,
  moveSchema,
  noteParamsSchema,
  propertiesSchema,
  restoreSchema,
  trashSchema,
} from "./schemas";

const router = express.Router();

router.post(
  "/notes",
  requireMcpNotePermission("create"),
  validate(createNoteSchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const input = createNoteSchema.parse(req.body);
    successResponse(res, await createMcpNote(user.id, input), "Note created");
  }),
);

router.patch(
  "/notes/:noteId/content",
  requireMcpNotePermission("update"),
  validateParams(noteParamsSchema),
  validate(contentEditSchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const { noteId } = noteParamsSchema.parse(req.params);
    const input = contentEditSchema.parse(req.body);
    successResponse(
      res,
      await editMcpNoteContent(user.id, noteId, input),
      "Content updated",
    );
  }),
);

router.patch(
  "/notes/:noteId/properties",
  requireMcpNotePermission("update"),
  validateParams(noteParamsSchema),
  validate(propertiesSchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const { noteId } = noteParamsSchema.parse(req.params);
    const input = propertiesSchema.parse(req.body);
    successResponse(
      res,
      await updateMcpNoteProperties(user.id, noteId, input),
      "Properties updated",
    );
  }),
);

router.post(
  "/notes/:noteId/move",
  requireMcpNotePermission("move"),
  validateParams(noteParamsSchema),
  validate(moveSchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const { noteId } = noteParamsSchema.parse(req.params);
    const input = moveSchema.parse(req.body);
    successResponse(
      res,
      await moveMcpNote(user.id, noteId, input),
      "Note moved",
    );
  }),
);

router.post(
  "/notes/:noteId/archive",
  requireMcpNotePermission("archive"),
  validateParams(noteParamsSchema),
  validate(archiveSchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const { noteId } = noteParamsSchema.parse(req.params);
    const input = archiveSchema.parse(req.body);
    successResponse(
      res,
      await archiveMcpNote(user.id, noteId, input),
      input.archived ? "Note archived" : "Note unarchived",
    );
  }),
);

router.post(
  "/notes/:noteId/trash",
  requireMcpNotePermission("trash"),
  validateParams(noteParamsSchema),
  validate(trashSchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const { noteId } = noteParamsSchema.parse(req.params);
    const input = trashSchema.parse(req.body);
    successResponse(
      res,
      await trashMcpNote(user.id, noteId, input),
      "Note moved to trash",
    );
  }),
);

router.post(
  "/notes/:noteId/restore",
  requireMcpNotePermission("restore"),
  validateParams(noteParamsSchema),
  validate(restoreSchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const { noteId } = noteParamsSchema.parse(req.params);
    const input = restoreSchema.parse(req.body);
    successResponse(
      res,
      await restoreMcpNote(user.id, noteId, input),
      "Note restored",
    );
  }),
);

export default router;
