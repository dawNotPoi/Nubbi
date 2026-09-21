import type { Request } from "express";

/** 服务端认证支持的凭证类型。 */
export type AuthMethod = "session" | "jwt" | "apiKey";

/** 通过认证后可交给业务层使用的账号身份。 */
export type AuthenticatedActor = {
  id: string;
  email?: string;
  name?: string;
  image?: string;
};

/** API Key 验证后保留的限制信息，供普通 Key 与 MCP Key 授权使用。 */
export type ApiKeyContext = {
  id: string;
  name: string | null;
  metadata: Record<string, unknown> | null;
  permissions: Record<string, string[]> | null;
  expiresAt: Date | null;
};

/** 一次请求的统一认证结果，明确保留凭证类型与 API Key scope。 */
export type RequestAuthContext = {
  method: AuthMethod;
  user: AuthenticatedActor;
  apiKey?: ApiKeyContext;
};

/** 已附加统一认证结果的 Express 请求。 */
export interface AuthRequest extends Request {
  user?: AuthenticatedActor;
  authContext?: RequestAuthContext;
}

/** 认证后端不可用时抛出的领域错误，由传输层稳定映射为 503。 */
export class AuthBackendUnavailableError extends Error {
  readonly status = 503;
  readonly cause?: unknown;

  /**
   * 创建认证后端不可用错误。
   * @param cause 导致认证无法完成的原始异常。
   */
  constructor(cause?: unknown) {
    super("Authentication service unavailable");
    this.name = "AuthBackendUnavailableError";
    this.cause = cause;
  }
}
