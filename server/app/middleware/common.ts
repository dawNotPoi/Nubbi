import { NextFunction, Request, Response } from "express";
import logger from "@/common/logger";

export interface AppError extends Error {
  status?: number;
  data?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  logger.error("未捕获的异常", err);
  const status = err.status || 500;
  const isMcpRequest = req.originalUrl.startsWith("/mcp-api");

  res.status(status).json({
    code: 0,
    message:
      isMcpRequest && status >= 500
        ? "Internal server error"
        : err.message || "服务器内部错误",
    error:
      process.env.NODE_ENV === "production" || isMcpRequest
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
  (fn: AsyncRequestHandler) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
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
