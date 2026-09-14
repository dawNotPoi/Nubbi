import { httpError } from "@/common/http-error";
import type { AuthRequest } from "@/middleware/common";
import { auth } from "./auth";
import { toWebHeaders } from "./requestHeaders";

/** 已认证用户类型，从 AuthRequest 的 user 字段推导 */
export type AuthenticatedUser = NonNullable<AuthRequest["user"]>;

/** 从请求中提取已认证用户，未认证时抛出 401 */
export function requireAuthenticatedUser(
  req: AuthRequest,
): AuthenticatedUser {
  if (!req.user) throw httpError(401, "Unauthorized");
  return req.user;
}

/** 延迟获取已认证用户（先检查 req.user，缺失时通过 session token 解析） */
export async function getUser(
  req: AuthRequest,
): Promise<AuthenticatedUser> {
  if (req.user) return req.user;
  const session = await auth.api.getSession({
    headers: toWebHeaders(req.headers),
  });
  if (!session?.user) {
    throw httpError(401, "Unauthorized");
  }
  const user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image ?? undefined,
  };
  req.user = user;
  return user;
}
