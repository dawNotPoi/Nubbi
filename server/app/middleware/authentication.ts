import { auth } from "@/lib/auth";
import { toWebHeaders } from "@/lib/requestHeaders";
import logger from "@/common/logger";
import { getErrorStatusCode, httpError } from "@/common/http-error";
import type { NextFunction, Request, Response } from "express";
import { importJWK, jwtVerify, type JWK } from "jose";
import type { IncomingHttpHeaders } from "node:http";
import type {
  ApiKeyContext,
  AuthRequest,
  RequestAuthContext,
} from "./common";
import { trackAuthenticatedMutation } from "./account-mutation";

type JwkKey = Record<string, unknown> & { alg?: string };

let jwksCache: { keys: JwkKey[]; cachedAt: number } | null = null;
const JWKS_TTL = 60 * 60 * 1000;

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

const verifyJwt = async (
  token: string,
): Promise<Record<string, unknown> | null> => {
  const keys = await getPublicKeys();
  for (const keyData of keys) {
    try {
      const publicKey = await importJWK(
        keyData as JWK,
        keyData.alg ?? "EdDSA",
      );
      const { payload } = await jwtVerify(token, publicKey);
      return payload as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
};

const findExistingAuthUser = async (userId: string) => {
  const authContext = await auth.$context;
  return authContext.internalAdapter.findUserById(userId);
};

export const unauthorized = (res: Response): void => {
  res.status(401).json({ code: 0, message: "Unauthorized", data: null });
};

export const sendAuthenticationError = (
  res: Response,
  error: unknown,
  next: NextFunction,
): void => {
  const status = getErrorStatusCode(error);
  if (status === 429) {
    const message =
      error instanceof Error ? error.message : "请求过于频繁，请稍后重试";
    res.status(429).json({ code: 0, message, data: null });
    return;
  }
  if (status === 400 || status === 401 || status === 403) {
    unauthorized(res);
    return;
  }
  if (status === 409) {
    next(error);
    return;
  }

  logger.error("认证服务异常", { error });
  next(error);
};

export const attachAuthContext = (
  req: Request,
  context: RequestAuthContext,
): void => {
  const authRequest = req as AuthRequest;
  authRequest.user = context.user;
  authRequest.authContext = context;
};

export const getSessionAuthContext = async (
  req: Request,
): Promise<RequestAuthContext | null> =>
  getSessionAuthContextFromHeaders(req.headers);

export const getSessionAuthContextFromHeaders = async (
  headers: IncomingHttpHeaders,
): Promise<RequestAuthContext | null> => {
  const headerValue = headers.authorization;
  const authHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token.split(".").length === 3) {
      const payload = await verifyJwt(token);
      if (!payload?.sub) return null;
      const owner = await findExistingAuthUser(String(payload.sub));
      if (!owner) return null;
      return {
        method: "jwt",
        user: {
          id: owner.id,
          email: owner.email,
          name: owner.name,
          image: owner.image ?? undefined,
        },
      };
    }
  }

  const session = await auth.api.getSession({
    headers: toWebHeaders(headers),
  });
  if (!session?.user) return null;
  return {
    method: "session",
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image ?? undefined,
    },
  };
};

export const getApiKeyContext = async (
  key: string,
): Promise<RequestAuthContext | null> => {
  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result?.valid || !result.key?.userId) {
    if (result?.error?.code === "RATE_LIMITED") {
      throw httpError(429, "API key rate limit exceeded");
    }
    return null;
  }
  if (!(await findExistingAuthUser(result.key.userId))) return null;

  const apiKey: ApiKeyContext = {
    id: result.key.id,
    name: result.key.name,
    metadata: result.key.metadata,
    permissions: result.key.permissions ?? null,
    expiresAt: result.key.expiresAt,
  };
  return {
    method: "apiKey",
    user: { id: result.key.userId },
    apiKey,
  };
};

export const authenticateWithApiKey = async (
  req: Request,
): Promise<RequestAuthContext | null> => {
  const existingContext = (req as AuthRequest).authContext;
  if (existingContext) return existingContext;
  const headerValue = req.headers["x-api-key"];
  const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return key ? getApiKeyContext(key) : getSessionAuthContext(req);
};

export const authenticateBySession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = await getSessionAuthContext(req);
    if (!context) return void unauthorized(res);
    attachAuthContext(req, context);
    trackAuthenticatedMutation(req, res, context.user.id);
    next();
  } catch (error) {
    sendAuthenticationError(res, error, next);
  }
};
