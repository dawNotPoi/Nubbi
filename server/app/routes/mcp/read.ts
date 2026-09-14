import { getMcpContext } from "@/controller/mcp/context";
import {
  getMcpNote,
  listMcpNotes,
  listMcpTrash,
  searchMcpNotes,
} from "@/controller/mcp/noteRead";
import { getUser } from "@/lib/authUser";
import { asyncHandler } from "@/middleware/common";
import { requireMcpNotePermission } from "@/middleware/session";
import { validateParams, validateQuery } from "@/middleware/validator";
import express from "express";
import { successResponse } from "../utils";
import {
  listNotesQuerySchema,
  noteDetailQuerySchema,
  noteParamsSchema,
  searchNotesQuerySchema,
  trashQuerySchema,
} from "./schemas";

const router = express.Router();
const requireRead = requireMcpNotePermission("read");

router.get(
  "/context",
  requireRead,
  asyncHandler(async (req, res) => {
    successResponse(res, getMcpContext(req.authContext), "MCP context ready");
  }),
);

router.get(
  "/notes",
  requireRead,
  validateQuery(listNotesQuerySchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const input = listNotesQuerySchema.parse(req.query);
    successResponse(res, await listMcpNotes(user.id, input));
  }),
);

router.get(
  "/notes/search",
  requireRead,
  validateQuery(searchNotesQuerySchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const input = searchNotesQuerySchema.parse(req.query);
    successResponse(res, await searchMcpNotes(user.id, input));
  }),
);

router.get(
  "/trash",
  requireRead,
  validateQuery(trashQuerySchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const input = trashQuerySchema.parse(req.query);
    successResponse(res, await listMcpTrash(user.id, input));
  }),
);

router.get(
  "/notes/:noteId",
  requireRead,
  validateParams(noteParamsSchema),
  validateQuery(noteDetailQuerySchema),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const { noteId } = noteParamsSchema.parse(req.params);
    const input = noteDetailQuerySchema.parse(req.query);
    successResponse(
      res,
      await getMcpNote(user.id, noteId, input),
    );
  }),
);

export default router;
