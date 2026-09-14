import type { AuthRequest } from "@/middleware/common";
import { auth } from "./auth";
import { toWebHeaders } from "./requestHeaders";

export async function getUser(
  req: AuthRequest,
): Promise<{ id: string; email?: string; name?: string }> {
  if (req.user) return req.user;
  const session = await auth.api.getSession({
    headers: toWebHeaders(req.headers),
  });
  if (!session?.user) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
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
