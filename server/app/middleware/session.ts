// middleware/auth.js

import { auth } from "@/lib/auth";
import { NextFunction, Request, Response } from "express";
//会话解析中间件
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (!session || !session.user) {
      res.status(401).json({ code: 0, message: "Unauthorized" });
      return;
    }
    (req as any).user = session.user;
    next();
  } catch (error) {
    res.status(401).json({ code: 0, message: "Unauthorized" });
    return;
  }
}

export default requireAuth;
