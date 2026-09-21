import { getErrorStatusCode, httpError } from "@/common/http-error";
import type { IncomingHttpHeaders } from "node:http";
import {
  AuthBackendUnavailableError,
  type ApiKeyContext,
  type AuthenticatedActor,
  type RequestAuthContext,
} from "./types";

/** HTTP 与 Socket 共用的凭证解析输入。 */
export type ResolveAuthContextInput = {
  headers: IncomingHttpHeaders;
  allowApiKey: boolean;
};

type ProviderUser = {
  id: string;
  email?: string;
  name?: string;
  image?: string | null;
};

type ApiKeyVerification = {
  valid: boolean;
  error?: { code?: string } | null;
  key?: (ApiKeyContext & {
    referenceId?: unknown;
    userId?: unknown;
  }) | null;
};

/** 统一凭证解析器使用的可替换 provider 能力。 */
export type CredentialResolverDependencies = {
  verifyJwt: (token: string) => Promise<Record<string, unknown> | null>;
  getSession: (
    headers: IncomingHttpHeaders,
  ) => Promise<{ user?: ProviderUser | null } | null>;
  verifyApiKey: (key: string) => Promise<ApiKeyVerification>;
  resolveApiKeyOwnerId: (key: {
    referenceId?: unknown;
    userId?: unknown;
  }) => string | null;
  findUserById: (userId: string) => Promise<ProviderUser | null>;
  probeApiKeyRecord: (key: string) => Promise<boolean>;
};

/** 统一凭证解析函数类型。 */
export type CredentialResolver = (
  input: ResolveAuthContextInput,
) => Promise<RequestAuthContext | null>;

const AMBIGUOUS_API_KEY_ERROR_CODE = "INVALID_API_KEY";

/** 真实记录仍存在但 provider 返回 catch-all invalid 时使用的安全诊断 cause。 */
class ApiKeyVerificationIndeterminateError extends Error {
  constructor() {
    super("API key provider returned an indeterminate verification result");
    this.name = "ApiKeyVerificationIndeterminateError";
  }
}

/**
 * 把 provider 用户转换为业务层只读身份。
 * @param user Better Auth 返回的用户记录。
 * @returns 仅含业务认证所需字段的 actor。
 */
const toAuthenticatedActor = (user: ProviderUser): AuthenticatedActor => ({
  id: user.id,
  email: user.email,
  name: user.name,
  image: user.image ?? undefined,
});

/**
 * 读取 Node 请求头中的单值，重复头只采用第一个值。
 * @param headers Node.js 原始请求头。
 * @param name 允许读取的认证头名称。
 * @returns 首个字符串头值；未提供时返回 undefined。
 */
const readHeader = (
  headers: IncomingHttpHeaders,
  name: "authorization" | "x-api-key",
): string | undefined => {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * 将 provider 异常区分为无效凭证、限流和认证后端不可用。
 * @param error provider 或探针抛出的原始异常。
 * @returns 仅在 provider 明确给出无效凭证状态时返回 null。
 */
const normalizeProviderFailure = (error: unknown): null => {
  if (error instanceof AuthBackendUnavailableError) throw error;
  const status = getErrorStatusCode(error);
  if (status === 400 || status === 401 || status === 403) return null;
  if (status === 429 || status === 409) throw error;
  throw new AuthBackendUnavailableError(error);
};

/**
 * 创建 HTTP 与 Socket 共用的凭证解析器。
 * @param dependencies JWT、Session、API Key 与用户查询能力。
 * @returns 按 API Key 或 JWT/Session 解析身份的函数。
 */
export const createCredentialResolver = (
  dependencies: CredentialResolverDependencies,
): CredentialResolver =>
  async ({ headers, allowApiKey }): Promise<RequestAuthContext | null> => {
    try {
      const apiKeyValue = readHeader(headers, "x-api-key");
      if (allowApiKey && apiKeyValue) {
        const result = await dependencies.verifyApiKey(apiKeyValue);
        if (result.error?.code === "RATE_LIMITED") {
          throw httpError(429, "API key rate limit exceeded");
        }
        if (
          !result.valid &&
          result.error?.code === AMBIGUOUS_API_KEY_ERROR_CODE
        ) {
          const recordExists = await dependencies.probeApiKeyRecord(
            apiKeyValue,
          );
          if (recordExists) {
            throw new AuthBackendUnavailableError(
              new ApiKeyVerificationIndeterminateError(),
            );
          }
        }
        if (!result.valid || !result.key) return null;

        const ownerId = dependencies.resolveApiKeyOwnerId(result.key);
        if (!ownerId) return null;
        const owner = await dependencies.findUserById(ownerId);
        if (!owner) return null;

        return {
          method: "apiKey",
          user: toAuthenticatedActor(owner),
          apiKey: {
            id: result.key.id,
            name: result.key.name,
            metadata: result.key.metadata,
            permissions: result.key.permissions,
            expiresAt: result.key.expiresAt,
          },
        };
      }

      const authorization = readHeader(headers, "authorization");
      if (authorization?.startsWith("Bearer ")) {
        const token = authorization.slice(7);
        if (token.split(".").length === 3) {
          const payload = await dependencies.verifyJwt(token);
          if (typeof payload?.sub !== "string" || payload.sub.length === 0) {
            return null;
          }
          const owner = await dependencies.findUserById(payload.sub);
          if (!owner) return null;
          return { method: "jwt", user: toAuthenticatedActor(owner) };
        }
      }

      const session = await dependencies.getSession(headers);
      if (!session?.user) return null;
      return {
        method: "session",
        user: toAuthenticatedActor(session.user),
      };
    } catch (error) {
      return normalizeProviderFailure(error);
    }
  };

let runtimeResolverPromise: Promise<CredentialResolver> | null = null;

/**
 * 延迟连接 Better Auth，避免认证领域模块形成初始化循环。
 * @returns 绑定真实 Better Auth adapter 的统一 resolver。
 */
const getRuntimeResolver = async (): Promise<CredentialResolver> => {
  if (!runtimeResolverPromise) {
    runtimeResolverPromise = Promise.all([
      import("@/lib/auth"),
      import("@/lib/requestHeaders"),
      import("@/services/auth/api-key-ownership"),
      import("@/services/auth/jwt-verifier"),
      import("@better-auth/api-key"),
    ]).then(
      ([
        { auth },
        { toWebHeaders },
        { resolveApiKeyOwnerId },
        { verifyAuthJwt },
        { API_KEY_TABLE_NAME, defaultKeyHasher },
      ]) =>
        createCredentialResolver({
          verifyJwt: verifyAuthJwt,
          getSession: async (headers) =>
            auth.api.getSession({ headers: toWebHeaders(headers) }),
          verifyApiKey: async (key) => {
            const result = await auth.api.verifyApiKey({
              body: { configId: "default", key },
            });
            const verifiedKey = result.key as
              | (NonNullable<typeof result.key> & { userId?: unknown })
              | null
              | undefined;
            return {
              valid: result.valid,
              error: result.error,
              key: verifiedKey
                ? {
                    id: verifiedKey.id,
                    name: verifiedKey.name,
                    metadata: verifiedKey.metadata,
                    permissions: verifiedKey.permissions ?? null,
                    expiresAt: verifiedKey.expiresAt,
                    referenceId: verifiedKey.referenceId,
                    userId: verifiedKey.userId,
                  }
                : null,
            };
          },
          resolveApiKeyOwnerId,
          findUserById: async (userId) => {
            const authContext = await auth.$context;
            return authContext.internalAdapter.findUserById(userId);
          },
          probeApiKeyRecord: async (key) => {
            const hashedKey = await defaultKeyHasher(key);
            const authContext = await auth.$context;
            const record = await authContext.adapter.findOne({
              model: API_KEY_TABLE_NAME,
              where: [{ field: "key", value: hashedKey }],
            });
            return record !== null;
          },
        }),
    );
  }
  return runtimeResolverPromise;
};

/**
 * 解析请求头中的统一认证上下文。
 * @param input 原始请求头及是否允许 API Key 的入口策略。
 * @returns 已验证的 Session、JWT 或 API Key 上下文；无效凭证返回 null。
 */
export const resolveAuthContext = async (
  input: ResolveAuthContextInput,
): Promise<RequestAuthContext | null> =>
  (await getRuntimeResolver())(input);
