import {
  storedModelConfigSchema,
  type StoredModelConfig,
  type ModelConfigInput,
  type PublicModelConfig,
} from "./model-config.schema.ts";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { projectRoot } from "../../config/env.ts";

const configFile = path.join(projectRoot, "config", "model.json");

/**
 * 生成未配置时的默认模型配置。
 * @returns 全部字段为空的 StoredModelConfig。
 */
const emptyConfig = (): StoredModelConfig => ({
  provider: "openai-compatible",
  authType: "api-key",
  baseUrl: "",
  apiKey: "",
  model: "",
  systemPrompt: "",
  headers: {},
  temperature: undefined,
  contextWindow: undefined,
});

/**
 * 读取并校验模型配置；文件不存在时返回空配置，由调用方引导用户去设置。
 * @returns 存储的模型配置。
 */
export const readModelConfig = async (): Promise<StoredModelConfig> => {
  const source = await readFile(configFile, "utf8").catch(() => "");
  return source ? storedModelConfigSchema.parse(JSON.parse(source)) : emptyConfig();
};

/**
 * 对外暴露配置时隐藏 API Key 原文，仅告知是否已配置。
 * @param config 存储的模型配置。
 * @returns 对外可见的配置，API Key 以布尔标记代替。
 */
export const publicModelConfig = (config: StoredModelConfig): PublicModelConfig => ({
  provider: config.provider,
  authType: config.authType,
  baseUrl: config.baseUrl,
  model: config.model,
  systemPrompt: config.systemPrompt,
  headers: config.headers,
  temperature: config.temperature,
  contextWindow: config.contextWindow,
  apiKeyConfigured: config.apiKey.length > 0,
});

/**
 * 保存模型配置；仅当显式清除、输入新 Key 或端点变化时改写 API Key。
 * @param input 客户端提交的配置（API Key 可留空表示保留旧值）。
 * @returns 保存后对外可见的配置。
 */
export const saveModelConfig = async (input: ModelConfigInput): Promise<PublicModelConfig> => {
  const current = await readModelConfig();
  const nextBaseUrl = input.baseUrl.replace(/\/+$/, "");
  const sameEndpoint = nextBaseUrl === current.baseUrl.replace(/\/+$/, "");
  // 只有显式清除、或输入了新 Key、或端点变了才会改写 API Key，否则保留旧值。
  const apiKey = input.clearApiKey ? "" : input.apiKey?.trim() || (sameEndpoint ? current.apiKey : "");
  const next: StoredModelConfig = {
    provider: input.provider,
    authType: input.authType,
    baseUrl: nextBaseUrl,
    apiKey,
    model: input.model.trim(),
    systemPrompt: input.systemPrompt,
    headers: input.headers ?? {},
    temperature: input.temperature,
    contextWindow: input.contextWindow,
  };
  await mkdir(path.dirname(configFile), { recursive: true });
  // 0600：仅当前用户可读写，保护明文 API Key。
  await writeFile(configFile, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return publicModelConfig(next);
};
