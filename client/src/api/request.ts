import { authorizedFetch } from "@/utils/auth";

type ApiResponse<T> = {
  code: 0 | 1;
  data: T;
  message: string;
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
