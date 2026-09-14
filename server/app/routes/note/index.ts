import { paginationQuerySchema } from "@/common/pagination";
import {
  getAllNotes,
  getNoteById,
  getNotes,
  getRecentNotes,
  getRootNotes,
  getTrashNotes,
} from "@/controller/note/list-query";
import { getNoteAncestors } from "@/controller/note/hierarchy-query";
import { searchNotes } from "@/controller/note/search-query";
import {
  createUserNote,
  getUserNoteChildren,
  updateUserNoteProperties,
} from "@/controller/note/user-commands";
import { deleteNote, purgeNote, restoreNote } from "@/controller/note/delete";
import {
  publishNote,
  updateNoteContent,
} from "@/controller/note/update";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import type { NoteAction } from "@/lib/notePolicy";
import { requireNotePermission } from "@/middleware/session";
import { createJsonRouteRegistrar } from "@/routes/infrastructure/json-route-registrar";
import {
  createNoteBodySchema,
  noteIdBodySchema,
  noteIdQuerySchema,
  noteParentQuerySchema,
  publishNoteBodySchema,
  searchNotesBodySchema,
  updateNoteContentBodySchema,
  updateNotePropertiesBodySchema,
} from "@/routes/note/schemas";
import express from "express";

const router = express.Router();
const noteRoutes = createJsonRouteRegistrar<NoteAction, AuthenticatedUser>(
  router,
  {
    authorize: requireNotePermission,
    resolveActor: requireAuthenticatedUser,
  },
);

noteRoutes.post("/create", {
  action: "create",
  body: createNoteBodySchema,
  message: "create success",
  handler: ({ actor, body }) =>
    createUserNote({ userId: actor.id, input: body }),
});

noteRoutes.put("/content", {
  action: "update",
  body: updateNoteContentBodySchema,
  message: "content updated",
  handler: ({ actor, body }) => {
    const { noteId, content, ...options } = body;
    return updateNoteContent(actor.id, noteId, content, options);
  },
});

noteRoutes.put("/properties", {
  action: "update",
  body: updateNotePropertiesBodySchema,
  message: "properties updated",
  handler: ({ actor, body }) => {
    const { noteId, ...properties } = body;
    return updateUserNoteProperties({
      userId: actor.id,
      noteId,
      properties,
    });
  },
});

noteRoutes.put("/publish", {
  action: "publish",
  body: publishNoteBodySchema,
  message: "publish state updated",
  handler: ({ actor, body }) =>
    publishNote(actor.id, body.noteId, body.published),
});

noteRoutes.put("/restore", {
  action: "restore",
  body: noteIdBodySchema,
  message: "restore success",
  handler: ({ actor, body }) => restoreNote(body.noteId, actor.id),
});

noteRoutes.get("/all", {
  action: "read",
  message: "query success",
  handler: ({ actor }) => getAllNotes(actor.id),
});

noteRoutes.get("/roots", {
  action: "read",
  message: "query success",
  handler: ({ actor }) => getRootNotes(actor.id),
});

noteRoutes.get("/children", {
  action: "read",
  query: noteParentQuerySchema,
  message: "query success",
  handler: ({ actor, query }) =>
    getUserNoteChildren(actor.id, query.parentId),
});

noteRoutes.get("/ancestors", {
  action: "read",
  query: noteIdQuerySchema,
  message: "query success",
  handler: ({ actor, query }) => getNoteAncestors(query.noteId, actor.id),
});

noteRoutes.get("/detail", {
  action: "read",
  query: noteIdQuerySchema,
  message: "query success",
  handler: ({ actor, query }) => getNoteById(query.noteId, actor.id),
});

noteRoutes.get("/recent", {
  action: "read",
  message: "query success",
  handler: ({ actor }) => getRecentNotes(actor.id),
});

noteRoutes.get("/trash", {
  action: "read",
  query: paginationQuerySchema,
  message: "query success",
  handler: ({ actor, query }) => getTrashNotes(actor.id, query),
});

noteRoutes.get("/getNote", {
  action: "read",
  message: "query success",
  handler: ({ actor }) => getNotes(actor.id),
});

noteRoutes.post("/search", {
  action: "read",
  body: searchNotesBodySchema,
  message: "query success",
  handler: ({ actor, body }) => searchNotes(actor.id, body.title),
});

noteRoutes.delete("/delete", {
  action: "trash",
  body: noteIdBodySchema,
  message: "delete success",
  handler: async ({ actor, body }) => {
    await deleteNote(body.noteId, actor.id);
    return null;
  },
});

noteRoutes.delete("/purge", {
  action: "purge",
  body: noteIdBodySchema,
  message: "purge success",
  handler: ({ actor, body }) => purgeNote(body.noteId, actor.id),
});

export default router;
