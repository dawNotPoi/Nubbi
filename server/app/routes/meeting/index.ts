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
/** 会议路由：需要登录的操作 */
type MeetingAction = "create" | "read" | "update" | "delete";

const meetingRoutes = createJsonRouteRegistrar<
  MeetingAction,
  AuthenticatedUser
>(router, {
  authorize: () => requireAuth,
  resolveActor: requireAuthenticatedUser,
});
/** 公开会议路由：无需登录即可查看的会议信息 */
const publicMeetingRoutes =
  createPublicJsonRouteRegistrar<MeetingAction>(router);

/** 创建会议 */
meetingRoutes.post("/create", {
  action: "create",
  body: createMeetingBodySchema,
  handler: ({ actor, body }) => createMeeting(actor, body),
});

/** 查询当前用户主持的会议 */
meetingRoutes.get("/findMyMeeting", {
  action: "read",
  handler: ({ actor }) => findMyMeetings(actor),
});

/** 分页查询全部会议 */
meetingRoutes.get("/list", {
  action: "read",
  query: paginationQuerySchema,
  handler: ({ query }) => findMeetingPage(query),
});

/** 按旧版 schema 分页查询会议（兼容旧客户端） */
meetingRoutes.post("/findByPage", {
  action: "read",
  body: legacyMeetingPageSchema,
  handler: ({ body }) => findLegacyMeetingPage(body),
});

/** 审核 / 更新会议信息 */
meetingRoutes.post("/vetMeeting", {
  action: "update",
  body: vetMeetingSchema,
  handler: ({ actor, body }) => vetHostedMeeting(actor, body),
});

/** 公开：查询全部会议 */
publicMeetingRoutes.get("/findAllMeeting", {
  action: "read",
  handler: () => findAllMeetings(),
});

/** 删除自己主持的会议 */
meetingRoutes.delete("/delete", {
  action: "delete",
  query: deleteMeetingQuerySchema,
  handler: ({ actor, query }) => deleteHostedMeeting(actor, query._id),
});

/** 公开：按 ID 查询会议详情 */
publicMeetingRoutes.get("/findById", {
  action: "read",
  query: meetingIdQuerySchema,
  handler: ({ query }) => findMeetingById(query.id),
});

/** 查询会议的评论列表 */
meetingRoutes.get("/comments", {
  action: "read",
  query: meetingIdQuerySchema,
  handler: ({ actor, query }) =>
    findHostedMeetingComments(actor, query.id),
});

/** 校验会议访问权限（密码 / 白名单） */
meetingRoutes.post("/validateAccess", {
  action: "read",
  body: validateMeetingAccessBodySchema,
  handler: ({ actor, body }) => validateMeetingAccess(actor, body),
});

export default router;
