import { getMcpContext } from "@/controller/mcp/context";
import {
  getMcpNote,
  listMcpNotes,
  listMcpTrash,
  searchMcpNotes,
} from "@/controller/mcp/noteRead";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import type { McpNoteAction } from "@/lib/mcpPolicy";
import { requireMcpNotePermission } from "@/middleware/session";
import { createJsonRouteRegistrar } from "@/routes/infrastructure/json-route-registrar";
import express from "express";
import {
  listNotesQuerySchema,
  noteDetailQuerySchema,
  noteParamsSchema,
  searchNotesQuerySchema,
  trashQuerySchema,
} from "./schemas";

const router = express.Router();
const mcpReadRoutes = createJsonRouteRegistrar<
  McpNoteAction,
  AuthenticatedUser
>(router, {
  authorize: requireMcpNotePermission,
  resolveActor: requireAuthenticatedUser,
});

mcpReadRoutes.get("/context", {
  action: "read",
  message: "MCP context ready",
  handler: ({ authContext }) => getMcpContext(authContext),
});

mcpReadRoutes.get("/notes", {
  action: "read",
  query: listNotesQuerySchema,
  handler: ({ actor, query }) => listMcpNotes(actor.id, query),
});

mcpReadRoutes.get("/notes/search", {
  action: "read",
  query: searchNotesQuerySchema,
  handler: ({ actor, query }) => searchMcpNotes(actor.id, query),
});

mcpReadRoutes.get("/trash", {
  action: "read",
  query: trashQuerySchema,
  handler: ({ actor, query }) => listMcpTrash(actor.id, query),
});

mcpReadRoutes.get("/notes/:noteId", {
  action: "read",
  params: noteParamsSchema,
  query: noteDetailQuerySchema,
  handler: ({ actor, params, query }) =>
    getMcpNote(actor.id, params.noteId, query),
});

export default router;
