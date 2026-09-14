import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { projectRoot } from "./env.js";

const providerSchema = z.enum(["openai-compatible", "codex-subscription"]);

// 落盘存储的模型配置：包含敏感 API Key，因此保存时按 0600 权限写文件。
const storedModelConfigSchema = z.object({
  provider: providerSchema.default("openai-compatible"),
  authType: z.enum(["api-key", "chatgpt"]).default("api-key"),
  baseUrl: z.string().trim().default(""),
  apiKey: z.string().default(""),
  model: z.string().trim().default(""),
  systemPrompt: z.string().default(""),
  // 自定义请求头：供需要特殊鉴权头的中转站使用，会合并进每次模型请求。
  headers: z.record(z.string()).default({}),
  // 采样温度：留空时使用默认 0.3，取值范围 0~2。
  temperature: z.number().min(0).max(2).optional(),
});

// 客户端输入：API Key 可留空（表示保持原值），并支持显式清除。
export const modelConfigInputSchema = storedModelConfigSchema
  .omit({ apiKey: true })
  .extend({
    apiKey: z.string().optional(),
    clearApiKey: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    // Provider 与登录方式必须匹配，避免保存出不可用的组合。
    if (value.provider === "openai-compatible") {
      if (value.authType !== "api-key") {
        context.addIssue({ code: "custom", message: "OpenAI-compatible 必须使用 API Key" });
      }
      if (!z.string().url().safeParse(value.baseUrl).success) {
        context.addIssue({ code: "custom", message: "请输入有效的 Base URL", path: ["baseUrl"] });
      }
    } else if (value.authType !== "chatgpt") {
      context.addIssue({ code: "custom", message: "订阅模式必须使用 ChatGPT 登录" });
    }
    if (!value.model.trim()) {
      context.addIssue({ code: "custom", message: "请选择模型", path: ["model"] });
    }
  });

export const modelConnectionInputSchema = z.object({
  baseUrl: z.string().trim().url("请输入有效的 Base URL"),
  apiKey: z.string().optional(),
  // 拉取模型列表时同模型请求一样支持自定义请求头。
  headers: z.record(z.string()).optional(),
});

export type StoredModelConfig = z.infer<typeof storedModelConfigSchema>;
export type ModelConfigInput = z.infer<typeof modelConfigInputSchema>;
export type ModelConnectionInput = z.infer<typeof modelConnectionInputSchema>;
export type PublicModelConfig = Omit<StoredModelConfig, "apiKey"> & {
  apiKeyConfigured: boolean;
};

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
  const apiKey = input.clearApiKey
    ? ""
    : input.apiKey?.trim() || (sameEndpoint ? current.apiKey : "");
  const next: StoredModelConfig = {
    provider: input.provider,
    authType: input.authType,
    baseUrl: nextBaseUrl,
    apiKey,
    model: input.model.trim(),
    systemPrompt: input.systemPrompt,
    headers: input.headers ?? {},
    temperature: input.temperature,
  };
  await mkdir(path.dirname(configFile), { recursive: true });
  // 0600：仅当前用户可读写，保护明文 API Key。
  await writeFile(configFile, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return publicModelConfig(next);
};

const modelListSchema = z.object({ data: z.array(z.object({ id: z.string().min(1) })) });

/**
 * 从 Provider 的 /models 接口拉取可用模型列表并去重排序。
 * 未填 Key 时若端点与已保存配置一致，则复用已保存的 Key。
 * @param input 连接参数（Base URL 与可选的 API Key）。
 * @returns 去重并排序后的模型 ID 列表。
 */
export const listProviderModels = async (input: ModelConnectionInput): Promise<string[]> => {
  const current = await readModelConfig();
  const baseUrl = input.baseUrl.replace(/\/+$/, "");
  const sameEndpoint = baseUrl === current.baseUrl.replace(/\/+$/, "");
  const apiKey = input.apiKey?.trim() || (sameEndpoint ? current.apiKey : "");
  const headers = new Headers({ Accept: "application/json" });
  if (apiKey) headers.set("Authorization", `Bearer ${apiKey}`);
  // 未显式传自定义请求头时，端点不变则复用已保存的请求头。
  const customHeaders = input.headers ?? (sameEndpoint ? current.headers : {});
  Object.entries(customHeaders).forEach(([name, value]) => headers.set(name, value));
  // 15 秒超时：模型列表接口通常较快，避免设置页长时间卡住。
  const response = await fetch(`${baseUrl}/models`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`获取模型失败 (${response.status})${detail ? `：${detail.slice(0, 200)}` : ""}`);
  }
  const parsed = modelListSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("模型服务返回了无法识别的模型列表");
  return [...new Set(parsed.data.data.map((item) => item.id))]
    .sort((left, right) => left.localeCompare(right));
};
