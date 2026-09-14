import {
  createLegacyFolder,
  getLegacyFileList,
  getLegacyFolders,
  renameLegacyItem,
} from "@/controller/file/compatibility";
import {
  deleteManagedBatch,
  deleteManagedItem,
  getManagedFileList,
  moveManagedBatch,
  moveManagedItem,
} from "@/controller/file/management";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import { requireAuthWithApiKey as requireAuth } from "@/middleware/session";
import { createJsonRouteRegistrar } from "@/routes/infrastructure/json-route-registrar";
import {
  createFolderSchema,
  deleteBatchSchema,
  deleteFileSchema,
  fileListQuerySchema,
  legacyListSchema,
  moveBatchSchema,
  moveFileSchema,
  renameFileSchema,
} from "./schemas";
import express from "express";

const router = express.Router();
type FileAction = "read" | "create" | "update" | "delete";
const fileRoutes = createJsonRouteRegistrar<FileAction, AuthenticatedUser>(
  router,
  {
    authorize: () => requireAuth,
    resolveActor: requireAuthenticatedUser,
  },
);

fileRoutes.get("/list", {
  action: "read",
  query: fileListQuerySchema,
  message: "query success",
  handler: ({ actor, query }) => getManagedFileList(actor.id, query),
});

fileRoutes.post("/move", {
  action: "update",
  body: moveFileSchema,
  message: "move success",
  handler: ({ actor, body }) => moveManagedItem(actor.id, body),
});

fileRoutes.post("/move-batch", {
  action: "update",
  body: moveBatchSchema,
  message: "batch move completed",
  handler: ({ actor, body }) => moveManagedBatch(actor.id, body),
});

fileRoutes.post("/delete", {
  action: "delete",
  body: deleteFileSchema,
  message: "delete success",
  handler: ({ actor, body }) => deleteManagedItem(actor.id, body),
});

fileRoutes.post("/delete-batch", {
  action: "delete",
  body: deleteBatchSchema,
  message: "batch delete completed",
  handler: ({ actor, body }) => deleteManagedBatch(actor.id, body),
});

fileRoutes.post("/list", {
  action: "read",
  body: legacyListSchema,
  handler: ({ actor, body }) => getLegacyFileList(actor.id, body.parentId),
});

fileRoutes.post("/createfolder", {
  action: "create",
  body: createFolderSchema,
  handler: ({ actor, body }) =>
    createLegacyFolder(actor.id, body.name, body.parentId),
});

fileRoutes.get("/folders", {
  action: "read",
  handler: ({ actor }) => getLegacyFolders(actor.id),
});

fileRoutes.post("/rename", {
  action: "update",
  body: renameFileSchema,
  handler: ({ actor, body }) =>
    renameLegacyItem(
      actor.id,
      body._id,
      body.name,
      body.kind,
    ),
});

export default router;
