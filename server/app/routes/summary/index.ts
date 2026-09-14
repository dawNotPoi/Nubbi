import { createSummary, findSummary } from "@/controller/summary";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import type { NoteAction } from "@/lib/notePolicy";
import { requireNotePermission } from "@/middleware/session";
import { createJsonRouteRegistrar } from "@/routes/infrastructure/json-route-registrar";
import {
  createSummaryBodySchema,
  findSummaryBodySchema,
} from "@/routes/summary/schemas";
import express from "express";

const router = express.Router();
type SummaryAction = Extract<NoteAction, "read" | "update">;
const summaryRoutes = createJsonRouteRegistrar<
  SummaryAction,
  AuthenticatedUser
>(router, {
  authorize: requireNotePermission,
  resolveActor: requireAuthenticatedUser,
});

summaryRoutes.post("/create", {
  action: "update",
  body: createSummaryBodySchema,
  handler: ({ actor, body }) => createSummary(actor.id, body),
});

summaryRoutes.post("/find", {
  action: "read",
  body: findSummaryBodySchema,
  handler: ({ actor, body }) => findSummary(actor.id, body),
});

export default router;
