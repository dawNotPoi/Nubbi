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

// 只解析模型响应中我们关心的字段，其余透传给 assistantMessage。
const responseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string().nullable().optional(),
      tool_calls: z.array(toolCallSchema).optional(),
    }),
  })).min(1),
});

/** 模型返回的工具参数是 JSON 字符串，解析失败时降级为空对象，避免整个请求失败。 */
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

/**
 * 调用 OpenAI 兼容的 /chat/completions 接口。
 * 返回拆分后的内容、结构化工具调用以及供多轮对话回传的 assistant 消息。
 */
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
  // 去掉末尾斜杠，避免拼出双斜杠路径。
  const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      // 没有可用工具时不传 tools，避免部分 Provider 报错。
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? "auto" : undefined,
      // 固定较低温度，保证个人助手的回答更稳定、少随机。
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
    // 原样保留模型返回的 assistant 消息，多轮对话时直接回传以保持上下文一致。
    assistantMessage: {
      role: "assistant" as const,
      content: message.content ?? null,
      tool_calls: message.tool_calls,
    },
  };
};
