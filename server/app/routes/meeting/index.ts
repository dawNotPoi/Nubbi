import {
  createMeeting,
  deleteHostedMeeting,
  validateMeetingAccess,
  vetHostedMeeting,
} from "@/controller/meeting/commands";
import {
  findAllMeetings,
  findHostedMeetingComments,
  findLegacyMeetingPage,
  findMeetingById,
  findMeetingPage,
  findMyMeetings,
} from "@/controller/meeting/queries";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import { requireAuthWithApiKey as requireAuth } from "@/middleware/session";
import {
  createJsonRouteRegistrar,
  createPublicJsonRouteRegistrar,
} from "@/routes/infrastructure/json-route-registrar";
import {
  createMeetingBodySchema,
  deleteMeetingQuerySchema,
  legacyMeetingPageSchema,
  meetingIdQuerySchema,
  validateMeetingAccessBodySchema,
  vetMeetingSchema,
} from "@/routes/meeting/schemas";
import { paginationQuerySchema } from "@/common/pagination";
import express from "express";

const router = express.Router();
type MeetingAction = "create" | "read" | "update" | "delete";

const meetingRoutes = createJsonRouteRegistrar<
  MeetingAction,
  AuthenticatedUser
>(router, {
  authorize: () => requireAuth,
  resolveActor: requireAuthenticatedUser,
});
const publicMeetingRoutes =
  createPublicJsonRouteRegistrar<MeetingAction>(router);

meetingRoutes.post("/create", {
  action: "create",
  body: createMeetingBodySchema,
  handler: ({ actor, body }) => createMeeting(actor, body),
});

meetingRoutes.get("/findMyMeeting", {
  action: "read",
  handler: ({ actor }) => findMyMeetings(actor),
});

meetingRoutes.get("/list", {
  action: "read",
  query: paginationQuerySchema,
  handler: ({ query }) => findMeetingPage(query),
});

meetingRoutes.post("/findByPage", {
  action: "read",
  body: legacyMeetingPageSchema,
  handler: ({ body }) => findLegacyMeetingPage(body),
});

meetingRoutes.post("/vetMeeting", {
  action: "update",
  body: vetMeetingSchema,
  handler: ({ actor, body }) => vetHostedMeeting(actor, body),
});

publicMeetingRoutes.get("/findAllMeeting", {
  action: "read",
  handler: () => findAllMeetings(),
});

meetingRoutes.delete("/delete", {
  action: "delete",
  query: deleteMeetingQuerySchema,
  handler: ({ actor, query }) => deleteHostedMeeting(actor, query._id),
});

publicMeetingRoutes.get("/findById", {
  action: "read",
  query: meetingIdQuerySchema,
  handler: ({ query }) => findMeetingById(query.id),
});

meetingRoutes.get("/comments", {
  action: "read",
  query: meetingIdQuerySchema,
  handler: ({ actor, query }) =>
    findHostedMeetingComments(actor, query.id),
});

meetingRoutes.post("/validateAccess", {
  action: "read",
  body: validateMeetingAccessBodySchema,
  handler: ({ actor, body }) => validateMeetingAccess(actor, body),
});

export default router;
