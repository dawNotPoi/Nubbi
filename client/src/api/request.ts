import {
  getAccessToken,
  handleUnauthorized,
  restoreAuthSession,
} from "@/utils/auth";

const baseUrl = import.meta.env.VITE_API_URL;

type ApiResponse<T> = {
  code: 0 | 1;
  data: T;
  message: string;
};

const resolveApiUrl = (url: string) => {
  const pathUrl = url.startsWith("/") ? url : `/${url}`;
  return `${baseUrl}${pathUrl}`;
};

const ensureAccessToken = async () => {
  const existingToken = getAccessToken();
  if (existingToken) return existingToken;

  await restoreAuthSession();
  return getAccessToken();
};

const withAuthHeaders = async (headers?: HeadersInit) => {
  const nextHeaders = new Headers(headers);
  const token = await ensureAccessToken();

  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  return nextHeaders;
};

export const authorizedFetch = async (
  url: string,
  init: RequestInit = {},
): Promise<Response> => {
  const response = await fetch(resolveApiUrl(url), {
    ...init,
    credentials: init.credentials ?? "omit",
    headers: await withAuthHeaders(init.headers),
  });

  if (response.status === 401) {
    await handleUnauthorized();
    throw new Error("认证失败，请重新登录");
  }

  return response;
};

export default async function request<T>(
  url: string,
  body?: unknown,
  method = "post",
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers = await withAuthHeaders(init.headers);

  if (!headers.has("Content-Type") && body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await authorizedFetch(url, {
    ...init,
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return response.json();
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

  return response.json();
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

export function getWebData() {
  return request("admin/info", undefined, "get");
}
