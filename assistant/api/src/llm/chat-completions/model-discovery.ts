import { z } from "zod";
const modelListSchema = z.object({ data: z.array(z.object({ id: z.string().min(1) })) });
/**
 * 从兼容协议的 models 端点发现模型，不读取本地配置或数据库。
 * @param connection 已解析的模型连接。
 * @returns 去重、排序后的模型 ID。
 */
export async function discoverCompletionModels(connection: {
  modelBaseUrl: string;
  modelApiKey: string;
  headers: Record<string, string>;
}): Promise<string[]> {
  const baseUrl = connection.modelBaseUrl;
  const headers = new Headers({ Accept: "application/json" });
  if (connection.modelApiKey) headers.set("Authorization", `Bearer ${connection.modelApiKey}`);
  Object.entries(connection.headers).forEach(([name, value]) => headers.set(name, value));
  // 用 URL 规范拼接 /models，兼容 baseUrl 带或不带末尾斜杠。
  const endpoint = new URL("models", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const response = await fetch(endpoint, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`获取模型失败 (${response.status})${detail ? `：${detail.slice(0, 200)}` : ""}`);
  }
  // 先读文本再手动解析：非 JSON 响应（如 Base URL 指向网页返回的 HTML）直接抛可读错误。
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`模型服务返回了非 JSON 响应（${contentType || "未知类型"}），请检查 Base URL 是否正确`);
  }
  const parsed = modelListSchema.safeParse(json);
  if (!parsed.success) throw new Error("模型服务返回了无法识别的模型列表");
  return [...new Set(parsed.data.data.map((item) => item.id))].sort((left, right) => left.localeCompare(right));
}
