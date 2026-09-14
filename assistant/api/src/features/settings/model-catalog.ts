import { readModelConfig } from "./model-config.repository.ts";
import type { ModelConnectionInput } from "./model-config.schema.ts";
import { discoverCompletionModels } from "../../llm/chat-completions/model-discovery.ts";
/**
 * 解析模型发现请求的凭据；仅同端点允许复用保存的密钥。
 * @param input 用户提交的临时连接参数。
 * @returns 该连接的模型 ID 列表，不修改保存配置。
 */
export async function listProviderModels(input: ModelConnectionInput): Promise<string[]> {
  const current = await readModelConfig();
  const baseUrl = input.baseUrl.replace(/\/+$/, "");
  const sameEndpoint = baseUrl === current.baseUrl.replace(/\/+$/, "");
  const apiKey = input.apiKey?.trim() || (sameEndpoint ? current.apiKey : "");

  return discoverCompletionModels({
    modelBaseUrl: baseUrl,
    modelApiKey: apiKey,
    headers: input.headers ?? (sameEndpoint ? current.headers : {}),
  });
}
