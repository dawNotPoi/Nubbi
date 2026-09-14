import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";

const matchesToken = (provided: string, expected: string): boolean => {
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
};

export const requireConfigAccess = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const expected = env.CONFIG_ADMIN_TOKEN ?? env.MCP_CONFIG_TOKEN;
  if (!expected) {
    response.status(503).json({
      message: "请先在 assistant/.env 中配置 CONFIG_ADMIN_TOKEN 并重启 Assistant API",
    });
    return;
  }
  const provided = request.get("x-config-token")
    ?? request.get("x-mcp-config-token")
    ?? "";
  if (!matchesToken(provided, expected)) {
    response.status(401).json({ message: "设置管理密钥无效" });
    return;
  }
  next();
};
