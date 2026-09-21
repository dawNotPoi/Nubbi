import {
  hasMcpPermissionFingerprint,
  MCP_NOTE_ACTIONS,
  MCP_POLICY_VERSION,
  type McpNoteAction,
} from "@/lib/mcpPolicy";
import type { NoteAction } from "@/lib/notePolicy";
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { trackAuthenticatedMutation } from "./account-mutation";
import {
  attachAuthContext,
  authenticateBySession,
  authenticateWithApiKey,
  getApiKeyContext,
  sendAuthenticationError,
  unauthorized,
} from "./authentication";
import type { RequestAuthContext } from "@/services/auth/types";

/** 返回 403 禁止访问的标准响应 */
const forbidden = (res: Response, message = "Permission denied") =>
  res.status(403).json({ code: 0, message, data: null });

/** 判断认证上下文是否为 MCP Agent 的 API Key */
const isMcpPolicyContext = (context: RequestAuthContext): boolean =>
  context.method === "apiKey" &&
  (context.apiKey?.metadata?.kind === "mcp" ||
    hasMcpPermissionFingerprint(context.apiKey?.permissions));

/** 校验 API Key 的 scoped 权限是否允许指定资源上的指定操作 */
const hasScope = (
  context: RequestAuthContext,
  resource: string,
  action: string,
): boolean => {
  if (context.method !== "apiKey") return true;
  const permissions = context.apiKey?.permissions;
  const isMcp = isMcpPolicyContext(context);
  if (
    isMcp &&
    (resource !== "note" ||
      !MCP_NOTE_ACTIONS.includes(action as (typeof MCP_NOTE_ACTIONS)[number]))
  ) {
    return false;
  }
  if (permissions === null) return !isMcp;
  return Boolean(permissions?.[resource]?.includes(action));
};

/** API Key 授权选项 */
type AuthorizationOptions = {
  mcpOnly?: boolean;
  rejectMcp?: boolean;
};

/** 基于 API Key 的授权中间件：认证 + 权限校验 + 账号变更互斥登记 */
const authorize =
  (
    resource?: string,
    action?: string,
    options: AuthorizationOptions = {},
  ): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = await authenticateWithApiKey(req);
      if (!context) return void unauthorized(res);

      if (options.mcpOnly) {
        if (context.method !== "apiKey") return void unauthorized(res);
        if (
          context.apiKey?.metadata?.kind !== "mcp" ||
          context.apiKey.metadata.policyVersion !== MCP_POLICY_VERSION
        ) {
          return void forbidden(res, "An MCP Agent API key is required");
        }
      }

      if (options.rejectMcp && isMcpPolicyContext(context)) {
        return void forbidden(
          res,
          "MCP Agent keys must use /mcp-api endpoints",
        );
      }

      const isScopedKey =
        context.method === "apiKey" &&
        (context.apiKey?.permissions !== null ||
          context.apiKey?.metadata?.kind === "mcp");
      if (
        isScopedKey &&
        (!resource || !action || !hasScope(context, resource, action))
      ) {
        return void forbidden(res);
      }

      attachAuthContext(req, context);
      trackAuthenticatedMutation(req, res, context.user.id);
      next();
    } catch (error) {
      sendAuthenticationError(res, error, next);
    }
  };

/** 基于会话（Cookie）的认证中间件 */
async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await authenticateBySession(req, res, next);
}

/** 认证中间件：优先走 API Key，否则回退会话认证 */
export async function requireAuthWithApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await authorize()(req, res, next);
}

/** 拒绝 scoped API Key（带权限限制或 MCP 类型）访问非 MCP 端点 */
export async function rejectScopedApiKeys(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const headerValue = req.headers["x-api-key"];
  const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!key) return void next();

  try {
    const context = await getApiKeyContext(key);
    if (!context) return void unauthorized(res);
    if (
      context.apiKey?.permissions !== null ||
      context.apiKey?.metadata?.kind === "mcp"
    ) {
      return void forbidden(res);
    }
    attachAuthContext(req, context);
    next();
  } catch (error) {
    sendAuthenticationError(res, error, next);
  }
}

/** 普通用户对笔记操作的授权中间件（拒绝 MCP API Key） */
export const requireNotePermission = (action: NoteAction): RequestHandler =>
  authorize("note", action, { rejectMcp: true });

/** MCP Agent 对笔记操作的授权中间件（仅接受 MCP API Key） */
export const requireMcpNotePermission = (
  action: McpNoteAction,
): RequestHandler =>
  authorize("note", action, { mcpOnly: true });

export default requireAuth;
