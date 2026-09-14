import { authorizedFetch } from "@/utils/auth";

export type ApiResponse<T> = {
  code: 0 | 1;
  data: T;
  message: string;
};

type ApiErrorPayload = {
  message?: unknown;
  errorCode?: unknown;
};

export class ApiRequestError extends Error {
  status: number;
  errorCode?: string;

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
  }).then((response) => response.json());
}
