import { z } from "zod";
import type { StoredModelConfig } from "./model-config.js";
import type {
  ModelMessage,
  ModelTool,
  ModelToolCall,
} from "./types.js";

const toolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

const responseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string().nullable().optional(),
      tool_calls: z.array(toolCallSchema).optional(),
    }),
  })).min(1),
});

const parseArguments = (source: string): Record<string, unknown> => {
  try {
    const value: unknown = JSON.parse(source);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
};

export const requestModel = async (
  messages: ModelMessage[],
  tools: ModelTool[],
  signal: AbortSignal,
  config: StoredModelConfig,
) => {
  if (!config.baseUrl || !config.model) {
    throw new Error("模型未配置，请在设置中填写 Base URL 并选择模型");
  }
  const headers = new Headers({ "Content-Type": "application/json" });
  if (config.apiKey) headers.set("Authorization", `Bearer ${config.apiKey}`);
  const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? "auto" : undefined,
      temperature: 0.3,
    }),
    signal,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `模型请求失败 (${response.status})${detail ? `：${detail.slice(0, 300)}` : ""}`,
    );
  }
  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("模型返回了无法解析的响应");
  const message = parsed.data.choices[0]!.message;
  const toolCalls: ModelToolCall[] = (message.tool_calls ?? []).map((call) => ({
    id: call.id,
    name: call.function.name,
    arguments: parseArguments(call.function.arguments),
  }));
  return {
    content: message.content ?? "",
    toolCalls,
    assistantMessage: {
      role: "assistant" as const,
      content: message.content ?? null,
      tool_calls: message.tool_calls,
    },
  };
};
