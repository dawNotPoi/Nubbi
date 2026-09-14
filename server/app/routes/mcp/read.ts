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
/** MCP 读取路由注册器：仅接受 MCP API Key，全部为只读操作 */
const mcpReadRoutes = createJsonRouteRegistrar<
  McpNoteAction,
  AuthenticatedUser
>(router, {
  authorize: requireMcpNotePermission,
  resolveActor: requireAuthenticatedUser,
});

/** 获取 MCP 上下文：返回 Agent 可用的工具、策略和账号信息 */
mcpReadRoutes.get("/context", {
  action: "read",
  message: "MCP context ready",
  handler: ({ authContext }) => getMcpContext(authContext),
});

/** 查询笔记列表（分页） */
mcpReadRoutes.get("/notes", {
  action: "read",
  query: listNotesQuerySchema,
  handler: ({ actor, query }) => listMcpNotes(actor.id, query),
});

/** 按标题搜索笔记 */
mcpReadRoutes.get("/notes/search", {
  action: "read",
  query: searchNotesQuerySchema,
  handler: ({ actor, query }) => searchMcpNotes(actor.id, query),
});

/** 查询回收站中的笔记 */
mcpReadRoutes.get("/trash", {
  action: "read",
  query: trashQuerySchema,
  handler: ({ actor, query }) => listMcpTrash(actor.id, query),
});

/** 查询单个笔记详情 */
mcpReadRoutes.get("/notes/:noteId", {
  action: "read",
  params: noteParamsSchema,
  query: noteDetailQuerySchema,
  handler: ({ actor, params, query }) =>
    getMcpNote(actor.id, params.noteId, query),
});

export default router;
