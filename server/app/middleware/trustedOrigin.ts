import env from "@/lib/env";
import type { NextFunction, Request, Response } from "express";

const trustedOrigins = new Set(
  [env.CLIENT_URL, env.BETTER_AUTH_URL].map((value) => new URL(value).origin),
);

export const requireTrustedOrigin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const origin = req.get("origin");
  if (origin && !trustedOrigins.has(origin)) {
    res.status(403).json({
      code: 0,
      message: "Origin is not allowed for this operation",
      data: null,
    });
    return;
  }
  next();
};
