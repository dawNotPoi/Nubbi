import { isTrustedOrigin } from "@/lib/trusted-origins";
import type { NextFunction, Request, Response } from "express";

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
