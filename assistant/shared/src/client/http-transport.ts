/** 平台注入的 HTTP 实现；不依赖浏览器存储或 Expo 模块。 */
export type FetchResponse = typeof globalThis.fetch;
/** Assistant 服务连接，区别于供应商模型连接。 */
export type AssistantConnection = { assistantApiBaseUrl: string; fetchResponse: FetchResponse };
/** 统一的 JSON 请求与配置鉴权接口。 */
export type HttpTransport = {
  request: <T>(endpoint: string, init?: RequestInit) => Promise<T>;
  configRequest: <T>(configAccessToken: string, endpoint: string, init?: RequestInit) => Promise<T>;
};

/**
 * 提取服务端错误文案，不把未知 JSON 直接断言成业务对象。
 * @param response 非成功 HTTP 响应。
 * @returns 可展示的错误文本。
 */
export async function readResponseError(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  return payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
    ? payload.message
    : `请求失败 (${response.status})`;
}

/**
 * 创建平台无关请求实现；空请求体不添加 JSON Content-Type。
 * @param connection 服务地址和平台 fetch。
 * @returns JSON 请求能力。
 */
export function createHttpTransport(connection: AssistantConnection): HttpTransport {
  const request = async <T>(endpoint: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers);
    if (init?.body != null) headers.set("Content-Type", "application/json");
    const response = await connection.fetchResponse(
      `${connection.assistantApiBaseUrl.replace(/\/+$/, "")}${endpoint}`,
      { ...init, headers },
    );
    if (!response.ok) throw new Error(await readResponseError(response));
    if (response.status === 204) return undefined as T;
    if (!(response.headers.get("content-type") ?? "").includes("application/json"))
      throw new Error("目标不是 Assistant API，请检查服务地址");
    return response.json() as Promise<T>;
  };
  return {
    request,
    configRequest: <T>(configAccessToken: string, endpoint: string, init?: RequestInit): Promise<T> => {
      const headers = new Headers(init?.headers);
      headers.set("x-config-token", configAccessToken);
      return request<T>(endpoint, { ...init, headers });
    },
  };
}
