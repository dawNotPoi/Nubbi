import { fetch } from "expo/fetch";
import { createHttpTransport } from "@nubbi/assistant-shared/client";

/**
 * 连接前探活：10 秒超时，确保目标确实是 Assistant API。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @returns 无返回值；探活失败或超时抛出异常。
 */
export const testApiConnection = async (assistantApiBaseUrl: string): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const result = await createHttpTransport({
      assistantApiBaseUrl: assistantApiBaseUrl,
      fetchResponse: fetch,
    }).request<{ status: string }>("/api/health", { signal: controller.signal });
    if (result.status !== "ok") throw new Error("目标不是 Assistant API");
  } catch (error) {
    if (controller.signal.aborted) throw new Error("连接 Assistant API 超时");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
