import { createTag, deleteTag, listTags } from "@/controller/tag";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import { requireAuthWithApiKey as requireAuth } from "@/middleware/session";
import { createJsonRouteRegistrar } from "@/routes/infrastructure/json-route-registrar";
import { tagNameBodySchema } from "@/routes/tag/schemas";
import express from "express";

const router = express.Router();
type TagAction = "read" | "create" | "delete";

const tagRoutes = createJsonRouteRegistrar<TagAction, AuthenticatedUser>(
  router,
  {
    authorize: () => requireAuth,
    resolveActor: requireAuthenticatedUser,
  },
);

tagRoutes.get("/list", {
  action: "read",
  message: "query success",
  handler: ({ actor }) => listTags(actor.id),
});

tagRoutes.post("/create", {
  action: "create",
  body: tagNameBodySchema,
  message: "create success",
  handler: ({ actor, body }) => createTag(actor.id, body.name),
});

tagRoutes.delete("/delete", {
  action: "delete",
  body: tagNameBodySchema,
  message: "delete success",
  handler: async ({ actor, body }) => {
    await deleteTag(actor.id, body.name);
    return null;
  },
});

export default router;
