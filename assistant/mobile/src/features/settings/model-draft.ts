import type { ModelConfig } from "../../types.ts";

/**
 * 生成默认模型配置。
 * @returns 全空的模型配置对象。
 */
export const emptyModel = (): ModelConfig => ({
  provider: "openai-compatible",
  authType: "api-key",
  baseUrl: "",
  model: "",
  systemPrompt: "",
  headers: {},
  apiKeyConfigured: false,
});

/** 模型请求头的表单草稿：以键值对数组承载，便于增删。 */
export type ModelHeader = { key: string; value: string };

/** 服务端配置 → 请求头草稿数组。
 * @param headers 服务端保存的请求头对象。
 * @returns 可编辑的键值对数组。
 */
export const toHeaderPairs = (headers: Record<string, string>): ModelHeader[] =>
  Object.entries(headers).map(([key, value]) => ({ key, value }));

/** 请求头草稿数组 → 服务端配置；过滤空 key。
 * @param pairs 表单中的请求头键值对数组。
 * @returns 过滤后的请求头对象。
 */
export const fromHeaderPairs = (pairs: ModelHeader[]): Record<string, string> =>
  Object.fromEntries(pairs.map((item) => [item.key.trim(), item.value]).filter(([key]) => Boolean(key)));
