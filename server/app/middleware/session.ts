import {
  hasMcpPermissionFingerprint,
  MCP_NOTE_ACTIONS,
  MCP_POLICY_VERSION,
} from "@/lib/mcpPolicy";
import type { NextFunction, Request, Response } from "express";
import {
  attachAuthContext,
  authenticateBySession,
  authenticateWithApiKey,
  getApiKeyContext,
  sendAuthenticationError,
  unauthorized,
} from "./authentication";
import type { RequestAuthContext } from "./common";

const forbidden = (res: Response, message = "Permission denied") =>
  res.status(403).json({ code: 0, message, data: null });

const isMcpPolicyContext = (context: RequestAuthContext): boolean =>
  context.method === "apiKey" &&
  (context.apiKey?.metadata?.kind === "mcp" ||
    hasMcpPermissionFingerprint(context.apiKey?.permissions));

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

type AuthorizationOptions = {
  mcpOnly?: boolean;
  rejectMcp?: boolean;
};

const authorize =
  (
    resource?: string,
    action?: string,
    options: AuthorizationOptions = {},
  ) =>
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
          "MCP Agent keys must use /mcp-api for write operations",
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
      next();
    } catch (error) {
      sendAuthenticationError(res, error);
    }
  };

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  await authenticateBySession(req, res, next);
}

export async function requireAuthWithApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await authorize()(req, res, next);
}

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
    sendAuthenticationError(res, error);
  }
}

export const requireNotePermission = (action: string) =>
  authorize("note", action, { rejectMcp: action !== "read" });

export const requireMcpNotePermission = (action: string) =>
  authorize("note", action, { mcpOnly: true });

export default requireAuth;
