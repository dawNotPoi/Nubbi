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

/**
 * 包装异步路由处理器，设置账户变更追踪的 AsyncLocalStorage 上下文，
 * 并在处理器完成后自动释放变更锁。
 * Express 5 原生捕获异步处理器抛出的异常，不再需要手动 .catch(next)。
 */
export const withAccountContext =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const authRequest = req as AuthRequest;
    // 返回 Promise 链，Express 5 自动处理 rejections
    return runWithAccountMutationContext(res, () =>
      Promise.resolve(fn(authRequest, res, next)),
    ).finally(() => completeAccountMutationHandler(res));
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
