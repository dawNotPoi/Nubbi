import { httpError } from "@/common/http-error";
import type { AuthRequest } from "@/middleware/common";
import { auth } from "./auth";
import { toWebHeaders } from "./requestHeaders";

export type AuthenticatedUser = NonNullable<AuthRequest["user"]>;

export function requireAuthenticatedUser(
  req: AuthRequest,
): AuthenticatedUser {
  if (!req.user) throw httpError(401, "Unauthorized");
  return req.user;
}

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
