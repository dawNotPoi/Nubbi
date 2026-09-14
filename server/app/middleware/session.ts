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

const unauthorized = (res: Response) =>
  res.status(401).json({ code: 0, message: "Unauthorized" });

async function authenticateBySession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
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
        unauthorized(res);
        return;
      }
    }

    // 非 JWT bearer 或无 bearer，降级到 session 查询（支持 cookie + session token）
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (!session?.user) {
      unauthorized(res);
      return;
    }
    (req as any).user = session.user;
    next();
  } catch {
    unauthorized(res);
  }
}

// 仅接受 session/JWT，敏感路由（注销账号等）使用，API token 不可访问
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  await authenticateBySession(req, res, next);
}

// 在 session/JWT 基础上额外接受长期 API token（x-api-key 头），普通业务路由使用
export async function requireAuthWithApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const headerValue = req.headers["x-api-key"];
  const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!key) {
    await authenticateBySession(req, res, next);
    return;
  }

  try {
    // verifyApiKey 会校验 enabled/过期/限流，并更新 lastRequest 等字段；
    // 部分错误路径可能 throw，统一按 401 处理
    const result = await auth.api.verifyApiKey({ body: { key } });
    if (!result?.valid || !result.key?.userId) {
      unauthorized(res);
      return;
    }
    (req as any).user = { id: result.key.userId };
    (req as any).authType = "apiKey";
    next();
  } catch {
    unauthorized(res);
  }
}

export default requireAuth;
