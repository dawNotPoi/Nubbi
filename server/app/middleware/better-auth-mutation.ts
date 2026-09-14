import { getSessionAuthContext } from "@/middleware/authentication";
import { trackAuthenticatedMutation } from "@/middleware/account-mutation";
import type { NextFunction, Request, Response } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** 将 Better Auth 中已有登录态的写请求纳入账号注销互斥。 */
export const trackBetterAuthMutation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  try {
    const context = await getSessionAuthContext(req);
    if (context) {
      trackAuthenticatedMutation(req, res, context.user.id);
    }
    next();
  } catch (error) {
    next(error);
  }
};
