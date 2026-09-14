import { z } from "zod";
const providerSchema = z.enum(["openai-compatible", "codex-subscription"]);

/** 模型上下文窗口的默认值（token），未配置时按此估算占用比例与压缩预算。 */
export const DEFAULT_CONTEXT_WINDOW = 128_000;

/** 模型落盘格式校验，包含敏感 API Key，不可直接作为公开响应。 */
export const storedModelConfigSchema = z.object({
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
  // 模型上下文窗口（token），用于计算上下文占用比例与自动压缩预算。
  contextWindow: z.number().int().min(1024).max(2_000_000).optional(),
});

// 客户端输入：API Key 可留空（表示保持原值），并支持显式清除。
/** 模型设置接口输入校验；空 API Key 表示保留原值。 */
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

/** 模型发现接口的临时连接参数校验，不直接保存配置。 */
export const modelConnectionInputSchema = z.object({
  baseUrl: z.string().trim().url("请输入有效的 Base URL"),
  apiKey: z.string().optional(),
  // 拉取模型列表时同模型请求一样支持自定义请求头。
  headers: z.record(z.string()).optional(),
});

/** 服务端落盘配置，含敏感 API Key，不可直接返回客户端。 */
export type StoredModelConfig = z.infer<typeof storedModelConfigSchema>;
/** 模型设置写入契约，区分保持密钥与显式清除。 */
export type ModelConfigInput = z.infer<typeof modelConfigInputSchema>;
/** 读取供应商模型列表所需的连接参数。 */
export type ModelConnectionInput = z.infer<typeof modelConnectionInputSchema>;
/** 移除明文 API Key 后的公开配置视图。 */
export type PublicModelConfig = Omit<StoredModelConfig, "apiKey"> & {
  apiKeyConfigured: boolean;
};
