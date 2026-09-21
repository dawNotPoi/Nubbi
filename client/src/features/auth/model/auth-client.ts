import { apiKeyClient } from "@better-auth/api-key/client";
import { createAuthClient } from "better-auth/react";
import { getAuthBaseUrl } from "@/utils/env";
import type {
  AuthProviderSessionResult,
  AuthProviderSignInResult,
  AuthSessionProvider,
  AuthUser,
} from "./types";

const AUTH_API_PREFIX = "/api/auth";

/** 保留 Better Auth 插件客户端给 API Token 管理使用，不承担会话状态写入。 */
export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [apiKeyClient()],
  fetchOptions: {
    credentials: "include",
  },
});

/** Provider JSON 响应中可能出现的错误结构。 */
interface ProviderPayload {
  user?: AuthUser | null;
  session?: { token?: string | null } | null;
  token?: string | null;
  error?: unknown;
  message?: string;
  code?: string;
  [key: string]: unknown;
}

/**
 * 拼接 Better Auth 接口地址。
 * @param path Better Auth 路径。
 * @returns 完整接口地址。
 */
const resolveAuthUrl = (path: string): string =>
  `${getAuthBaseUrl()}${AUTH_API_PREFIX}${path}`;

/**
 * 读取 Provider JSON；空响应会转换为空对象。
 * @param response Provider 原始响应。
 * @returns 可安全读取的响应对象。
 */
const readProviderPayload = async (response: Response): Promise<ProviderPayload> =>
  ((await response.json().catch(() => ({}))) ?? {}) as ProviderPayload;

/**
 * 调用 Better Auth JSON 接口。
 * @param path Better Auth 路径。
 * @param init fetch 参数。
 * @returns 原始响应与解析后的 JSON。
 */
const requestProvider = async (
  path: string,
  init: RequestInit = {},
): Promise<{ response: Response; payload: ProviderPayload }> => {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(resolveAuthUrl(path), {
    ...init,
    credentials: "include",
    headers,
  });
  const payload = await readProviderPayload(response);
  return { response, payload };
};

/** 浏览器 Better Auth Provider 适配器。 */
export const browserAuthProvider: AuthSessionProvider = {
  async getSession(generation, signal): Promise<AuthProviderSessionResult> {
    void generation;
    const { response, payload } = await requestProvider("/get-session", {
      method: "GET",
      signal,
    });
    if (!response.ok) {
      throw new Error(payload.message || "获取登录状态失败。");
    }
    return {
      user: payload.user ?? null,
      sessionToken: payload.session?.token ?? payload.token ?? null,
      response,
    };
  },
  async signInEmail(email, password, generation, signal): Promise<AuthProviderSignInResult> {
    void generation;
    const { response, payload } = await requestProvider("/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      signal,
    });
    return {
      response,
      data: payload,
      error: response.ok ? payload.error : payload,
    };
  },
  async signInSocial(
    provider,
    callbackURL,
    errorCallbackURL,
    generation,
    signal,
  ): Promise<AuthProviderSignInResult> {
    void generation;
    const { response, payload } = await requestProvider("/sign-in/social", {
      method: "POST",
      body: JSON.stringify({ provider, callbackURL, errorCallbackURL }),
      signal,
    });
    return {
      response,
      data: payload,
      error: response.ok ? payload.error : payload,
      redirectUrl:
        payload.redirect === true && typeof payload.url === "string"
          ? payload.url
          : undefined,
    };
  },
  async signOut(generation, signal): Promise<Response> {
    void generation;
    const { response } = await requestProvider("/sign-out", {
      method: "POST",
      signal,
    });
    return response;
  },
};
