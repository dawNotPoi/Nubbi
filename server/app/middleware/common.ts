import { NextFunction, Request, Response } from "express";

// 统一错误处理中间件
export function errorHandler(err, req, res, next) {
  // 记录日志
  console.error(err);

  // 统一返回格式
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
) => Promise<any>;
export const asyncHandler =
  (fn: AsyncRequestHandler) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}
