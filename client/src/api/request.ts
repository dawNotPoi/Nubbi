import { authorizedFetch } from "@/features/auth/model/authorized-fetch";

/** Nubbi JSON API 的统一响应结构。 */
export type ApiResponse<T> = {
  code: 0 | 1;
  data: T;
  message: string;
};

type ApiErrorPayload = {
  message?: unknown;
  errorCode?: unknown;
};

/** 保留 HTTP 状态与业务错误码的请求错误。 */
export class ApiRequestError extends Error {
  status: number;
  errorCode?: string;

  /**
   * 创建可分类的 API 错误。
   * @param message 用户可读错误消息。
   * @param status HTTP 状态码。
   * @param errorCode 可选业务错误码。
   */
  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => null)) as
    | (T & ApiErrorPayload)
    | null;

  if (!response.ok) {
    const message =
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message
        : `请求失败 (${response.status})`;
    const errorCode =
      typeof payload?.errorCode === "string" ? payload.errorCode : undefined;
    throw new ApiRequestError(message, response.status, errorCode);
  }

  if (!payload) {
    throw new ApiRequestError("服务端返回了无效响应", response.status);
  }

  return payload;
};

export { authorizedFetch };

/**
 * 发送 JSON 请求并解析统一响应。
 * @param url API 相对或绝对地址。
 * @param body 待序列化的请求体。
 * @param method HTTP 方法。
 * @param init 额外 fetch 参数。
 * @returns 统一 API 响应。
 */
export default async function request<T>(
  url: string,
  body?: unknown,
  method = "post",
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await authorizedFetch(url, {
    ...init,
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseJsonResponse<ApiResponse<T>>(response);
}

/**
 * 发送无需 JSON 序列化的请求。
 * @param url API 相对或绝对地址。
 * @param body 原始可重放请求体。
 * @param method HTTP 方法。
 * @param init 额外 fetch 参数。
 * @returns 统一 API 响应。
 */
export async function requestWithNoJson<T>(
  url: string,
  body?: BodyInit | null,
  method = "post",
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const response = await authorizedFetch(url, {
    ...init,
    method,
    body: body ?? undefined,
  });

  return parseJsonResponse<ApiResponse<T>>(response);
}

/**
 * 发送带查询参数的 GET 请求。
 * @param url API 相对或绝对地址。
 * @param params 查询参数。
 * @param options 额外 fetch 参数。
 * @returns 统一 API 响应。
 */
export function Get<T = unknown>(
  url: string,
  params?: Record<string, unknown>,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          searchParams.append(key, String(item));
        }
      });
      return;
    }

    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  const requestUrl = query ? `${url}?${query}` : url;

  return authorizedFetch(requestUrl, {
    ...options,
    method: "GET",
  }).then((response) => response.json() as Promise<ApiResponse<T>>);
}
