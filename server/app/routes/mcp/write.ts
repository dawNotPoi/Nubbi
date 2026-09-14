import { editMcpNoteContent } from "@/controller/mcp/noteContent";
import { createMcpNote } from "@/controller/mcp/noteCreate";
import {
  archiveMcpNote,
  moveMcpNote,
  restoreMcpNote,
  trashMcpNote,
} from "@/controller/mcp/noteLifecycle";
import { updateMcpNoteProperties } from "@/controller/mcp/noteProperties";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import type { McpNoteAction } from "@/lib/mcpPolicy";
import { requireMcpNotePermission } from "@/middleware/session";
import { createJsonRouteRegistrar } from "@/routes/infrastructure/json-route-registrar";
import express from "express";
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
const mcpWriteRoutes = createJsonRouteRegistrar<
  McpNoteAction,
  AuthenticatedUser
>(router, {
  authorize: requireMcpNotePermission,
  resolveActor: requireAuthenticatedUser,
});

mcpWriteRoutes.post("/notes", {
  action: "create",
  body: createNoteSchema,
  message: "Note created",
  handler: ({ actor, body }) => createMcpNote(actor.id, body),
});

mcpWriteRoutes.patch("/notes/:noteId/content", {
  action: "update",
  params: noteParamsSchema,
  body: contentEditSchema,
  message: "Content updated",
  handler: ({ actor, params, body }) =>
    editMcpNoteContent(actor.id, params.noteId, body),
});

mcpWriteRoutes.patch("/notes/:noteId/properties", {
  action: "update",
  params: noteParamsSchema,
  body: propertiesSchema,
  message: "Properties updated",
  handler: ({ actor, params, body }) =>
    updateMcpNoteProperties(actor.id, params.noteId, body),
});

mcpWriteRoutes.post("/notes/:noteId/move", {
  action: "move",
  params: noteParamsSchema,
  body: moveSchema,
  message: "Note moved",
  handler: ({ actor, params, body }) =>
    moveMcpNote(actor.id, params.noteId, body),
});

mcpWriteRoutes.post("/notes/:noteId/archive", {
  action: "archive",
  params: noteParamsSchema,
  body: archiveSchema,
  message: "Archive state updated",
  handler: ({ actor, params, body }) =>
    archiveMcpNote(actor.id, params.noteId, body),
});

mcpWriteRoutes.post("/notes/:noteId/trash", {
  action: "trash",
  params: noteParamsSchema,
  body: trashSchema,
  message: "Note moved to trash",
  handler: ({ actor, params, body }) =>
    trashMcpNote(actor.id, params.noteId, body),
});

mcpWriteRoutes.post("/notes/:noteId/restore", {
  action: "restore",
  params: noteParamsSchema,
  body: restoreSchema,
  message: "Note restored",
  handler: ({ actor, params, body }) =>
    restoreMcpNote(actor.id, params.noteId, body),
});

export default router;
