import { auth } from "@/lib/auth";
import { importJWK, jwtVerify } from "jose";
import type { NextFunction, Request, Response } from "express";

type JwkKey = Record<string, unknown> & { alg?: string };

// 缓存 JWKS 公钥，避免每次请求都查 DB
let jwksCache: { keys: JwkKey[]; cachedAt: number } | null = null;
const JWKS_TTL = 60 * 60 * 1000; // 1 小时

const getPublicKeys = async (): Promise<JwkKey[]> => {
  const now = Date.now();
  if (jwksCache && now - jwksCache.cachedAt < JWKS_TTL) {
    return jwksCache.keys;
  }
  const result = await auth.api.getJwks({});
  const keys = (result?.keys ?? []) as JwkKey[];
  jwksCache = { keys, cachedAt: now };
  return keys;
};

const verifyJwt = async (token: string): Promise<Record<string, unknown> | null> => {
  try {
    const keys = await getPublicKeys();
    for (const keyData of keys) {
      try {
        const publicKey = await importJWK(keyData as any, (keyData.alg as string) ?? "EdDSA");
        const { payload } = await jwtVerify(token, publicKey);
        return payload as Record<string, unknown>;
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
};

// JWT 格式：三段 base64url 以 . 分隔
const looksLikeJwt = (token: string) => token.split(".").length === 3;

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);

      if (looksLikeJwt(token)) {
        const payload = await verifyJwt(token);
        if (payload?.sub) {
          (req as any).user = {
            id: payload.sub as string,
            email: payload.email as string | undefined,
            name: payload.name as string | undefined,
            image: payload.image as string | undefined,
          };
          next();
          return;
        }
        // JWT 格式正确但验证失败（过期或伪造），直接拒绝
        res.status(401).json({ code: 0, message: "Unauthorized" });
        return;
      }
    }

    // 非 JWT bearer 或无 bearer，降级到 session 查询（支持 cookie + session token）
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (!session?.user) {
      res.status(401).json({ code: 0, message: "Unauthorized" });
      return;
    }
    (req as any).user = session.user;
    next();
  } catch {
    res.status(401).json({ code: 0, message: "Unauthorized" });
  }
}

export default requireAuth;
