import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { projectRoot } from "./env.js";

const providerSchema = z.enum(["openai-compatible", "codex-subscription"]);

const storedModelConfigSchema = z.object({
  provider: providerSchema.default("openai-compatible"),
  authType: z.enum(["api-key", "chatgpt"]).default("api-key"),
  baseUrl: z.string().trim().default(""),
  apiKey: z.string().default(""),
  model: z.string().trim().default(""),
  systemPrompt: z.string().default(""),
});

export const modelConfigInputSchema = storedModelConfigSchema
  .omit({ apiKey: true })
  .extend({
    apiKey: z.string().optional(),
    clearApiKey: z.boolean().optional(),
  })
  .superRefine((value, context) => {
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
});

export type StoredModelConfig = z.infer<typeof storedModelConfigSchema>;
export type ModelConfigInput = z.infer<typeof modelConfigInputSchema>;
export type ModelConnectionInput = z.infer<typeof modelConnectionInputSchema>;
export type PublicModelConfig = Omit<StoredModelConfig, "apiKey"> & {
  apiKeyConfigured: boolean;
};

const configFile = path.join(projectRoot, "config", "model.json");

const emptyConfig = (): StoredModelConfig => ({
  provider: "openai-compatible",
  authType: "api-key",
  baseUrl: "",
  apiKey: "",
  model: "",
  systemPrompt: "",
});

export const readModelConfig = async (): Promise<StoredModelConfig> => {
  const source = await readFile(configFile, "utf8").catch(() => "");
  return source ? storedModelConfigSchema.parse(JSON.parse(source)) : emptyConfig();
};

export const publicModelConfig = (config: StoredModelConfig): PublicModelConfig => ({
  provider: config.provider,
  authType: config.authType,
  baseUrl: config.baseUrl,
  model: config.model,
  systemPrompt: config.systemPrompt,
  apiKeyConfigured: config.apiKey.length > 0,
});

export const saveModelConfig = async (input: ModelConfigInput): Promise<PublicModelConfig> => {
  const current = await readModelConfig();
  const nextBaseUrl = input.baseUrl.replace(/\/+$/, "");
  const sameEndpoint = nextBaseUrl === current.baseUrl.replace(/\/+$/, "");
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
  };
  await mkdir(path.dirname(configFile), { recursive: true });
  await writeFile(configFile, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return publicModelConfig(next);
};

const modelListSchema = z.object({ data: z.array(z.object({ id: z.string().min(1) })) });

export const listProviderModels = async (input: ModelConnectionInput): Promise<string[]> => {
  const current = await readModelConfig();
  const baseUrl = input.baseUrl.replace(/\/+$/, "");
  const sameEndpoint = baseUrl === current.baseUrl.replace(/\/+$/, "");
  const apiKey = input.apiKey?.trim() || (sameEndpoint ? current.apiKey : "");
  const headers = new Headers({ Accept: "application/json" });
  if (apiKey) headers.set("Authorization", `Bearer ${apiKey}`);
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
