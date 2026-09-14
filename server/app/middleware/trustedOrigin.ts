import { isTrustedOrigin } from "@/lib/trusted-origins";
import type { NextFunction, Request, Response } from "express";

/** 限制敏感操作（如 API Key 管理）仅允许来自受信任 Origin 的请求 */
export const requireTrustedOrigin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const origin = req.get("origin");
  if (!isTrustedOrigin(origin)) {
    res.status(403).json({
      code: 0,
      message: "Origin is not allowed for this operation",
      data: null,
    });
    return;
  }
  next();
};
