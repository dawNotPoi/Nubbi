import { NextFunction, Request, Response } from "express";

export interface AppError extends Error {
  status?: number;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(err);

  res.status(err.status || 500).json({
    code: 0,
    message: err.message || "服务器内部错误",
    error: process.env.NODE_ENV === "production" ? undefined : err.stack,
    data: null,
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
    email: string;
    name?: string;
  };
}
