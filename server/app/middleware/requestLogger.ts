import type { NextFunction, Request, Response } from "express";
import logger from "@/common/logger";
import { getSafeRequestPath } from "@/common/request-path";

/** 请求日志中间件：记录方法、路径、状态码和耗时 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  const pathname = getSafeRequestPath(req.originalUrl, req.path);

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${pathname}`, {
      method: req.method,
      path: pathname,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}
