import logger from "@/common/logger";
import { getErrorStatusCode } from "@/common/http-error";
import { getSafeRequestPath } from "@/common/request-path";
import env from "@/lib/env";
import {
  completeAccountMutationHandler,
  runWithAccountMutationContext,
} from "@/middleware/account-mutation";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface AppError extends Error {
  status?: unknown;
  statusCode?: unknown;
  data?: unknown;
  errorCode?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  completeAccountMutationHandler(res);
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = getErrorStatusCode(err);
  const isMcpRequest = req.originalUrl.startsWith("/mcp-api");
  const logContext = {
    error: err,
    method: req.method,
    path: getSafeRequestPath(req.originalUrl, req.path),
    status,
  };

  if (status >= 500) {
    logger.error("请求处理异常", logContext);
  } else {
    logger.warn("请求被拒绝", logContext);
  }

  res.status(status).json({
    code: 0,
    errorCode: err.errorCode,
    message:
      status >= 500
        ? isMcpRequest
          ? "Internal server error"
          : "服务器内部错误"
        : err.message || "请求失败",
    error:
      env.NODE_ENV === "production" || isMcpRequest
        ? undefined
        : err.stack,
    data: err.data ?? null,
  });
}

type AsyncRequestHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    const authRequest = req as AuthRequest;
    runWithAccountMutationContext(res, () =>
      Promise.resolve().then(() => fn(authRequest, res, next)),
    )
      .finally(() => completeAccountMutationHandler(res))
      .catch(next);
  };

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    name?: string;
    image?: string;
  };
  authContext?: RequestAuthContext;
}

export type AuthMethod = "session" | "jwt" | "apiKey";

export type ApiKeyContext = {
  id: string;
  name: string | null;
  metadata: Record<string, unknown> | null;
  permissions: Record<string, string[]> | null;
  expiresAt: Date | null;
};

export type RequestAuthContext = {
  method: AuthMethod;
  user: NonNullable<AuthRequest["user"]>;
  apiKey?: ApiKeyContext;
};
