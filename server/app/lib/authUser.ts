import { httpError } from "@/common/http-error";
import type {
  AuthenticatedActor,
  AuthRequest,
} from "@/services/auth/types";

/** 兼容旧业务调用方的已认证用户别名。 */
export type AuthenticatedUser = AuthenticatedActor;

/**
 * 从已由中间件认证的请求中提取用户。
 * @param req 已经过认证中间件的请求。
 * @returns 当前请求附加的认证用户。
 */
export function requireAuthenticatedUser(
  req: AuthRequest,
): AuthenticatedUser {
  if (!req.user) throw httpError(401, "Unauthorized");
  return req.user;
}

/**
 * 兼容旧异步调用形状，只读取统一 resolver 已附加的用户。
 * @param req 已经过认证中间件的请求。
 * @returns 当前请求附加的认证用户。
 */
export async function getUser(
  req: AuthRequest,
): Promise<AuthenticatedUser> {
  return requireAuthenticatedUser(req);
}
