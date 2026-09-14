import { z } from "zod";
import type { StoredModelConfig } from "./model-config.js";
import type {
  ModelMessage,
  ModelTool,
  ModelToolCall,
} from "../types.js";

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
      // 推理模型（如 DeepSeek V4）的思维链内容，带 tools 时需随 assistant 消息回传。
      reasoning_content: z.string().nullable().optional(),
      tool_calls: z.array(toolCallSchema).optional(),
    }),
  })).min(1),
});

/** 流式响应中单个 delta 片段的可能字段（OpenAI 兼容 SSE）。 */
type StreamDelta = {
  content?: string;
  reasoning_content?: string;
  tool_calls?: Array<{
    index?: number;
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }>;
};

/** 流式过程中回调给调用方的增量：文本或推理 token。 */
export type ModelDelta = { text?: string; reasoning?: string };

/**
 * 模型返回的工具参数是 JSON 字符串，解析失败时降级为空对象，避免整个请求失败。
 * @param source 模型返回的工具参数 JSON 字符串。
 * @returns 解析后的参数对象；解析失败时为空对象。
 */
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
 * 非流式响应兜底：个别 Provider 忽略 stream 参数并返回普通 JSON。
 * @param json 响应体解析后的 JSON。
 * @returns 与流式路径一致的结果结构。
 */
const parseNonStreaming = (json: unknown) => {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) throw new Error("模型返回了无法解析的响应");
  const message = parsed.data.choices[0]!.message;
  const toolCalls: ModelToolCall[] = (message.tool_calls ?? []).map((call) => ({
    id: call.id,
    name: call.function.name,
    arguments: parseArguments(call.function.arguments),
  }));
  return {
    content: message.content ?? "",
    reasoningContent: message.reasoning_content ?? null,
    toolCalls,
    assistantMessage: {
      role: "assistant" as const,
      content: message.content ?? null,
      reasoning_content: message.reasoning_content ?? null,
      tool_calls: message.tool_calls,
    },
  };
};

/**
 * 调用 OpenAI 兼容的 /chat/completions 接口（流式）。
 * 通过 SSE 逐 token 读取：文本/推理增量实时回调 onDelta，
 * 结束时把累积的内容、工具调用与可回传的 assistant 消息一并返回。
 * @param messages 多轮对话消息历史。
 * @param tools 可用工具定义，为空时省略 tools 参数。
 * @param signal 取消信号，用于中止请求。
 * @param config 模型配置（Base URL、API Key、模型名与温度策略）。
 * @param onDelta 流式增量回调，收到文本或推理 token 时调用。
 * @returns 响应内容、推理内容、解析后的工具调用列表与原始 assistant 消息。
 */
export const requestModel = async (
  messages: ModelMessage[],
  tools: ModelTool[],
  signal: AbortSignal,
  config: StoredModelConfig,
  onDelta?: (delta: ModelDelta) => void,
) => {
  if (!config.baseUrl || !config.model) {
    throw new Error("模型未配置，请在设置中填写 Base URL 并选择模型");
  }
  const headers = new Headers({ "Content-Type": "application/json" });
  if (config.apiKey) headers.set("Authorization", `Bearer ${config.apiKey}`);
  // 应用用户自定义请求头，可覆盖默认的 Content-Type / Authorization。
  for (const [name, value] of Object.entries(config.headers ?? {})) {
    headers.set(name, value);
  }
  // 用 URL 规范拼接完整端点，兼容 baseUrl 带或不带末尾斜杠。
  const endpoint = new URL(
    "chat/completions",
    config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`,
  );
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      // 没有可用工具时不传 tools，避免部分 Provider 报错。
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? "auto" : undefined,
      temperature: config.temperature ?? 0.3,
      // 请求流式响应，逐 token 推送增量。
      stream: true,
    }),
    signal,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `模型请求失败 (${response.status})${detail ? `：${detail.slice(0, 300)}` : ""}`,
    );
  }
  // 个别 Provider 会忽略 stream 参数并返回普通 JSON，按非流式兜底解析。
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    return parseNonStreaming(await response.json());
  }
  if (!response.body) throw new Error("当前 Provider 不支持流式响应");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";
  // 工具调用按 index 累积，arguments 是跨分片拼接的 JSON 字符串。
  const toolCalls: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }> = [];

  /** 处理单条 data 行：累积内容与工具调用，并回调增量。 */
  const handleData = (data: string): void => {
    if (!data || data === "[DONE]") return;
    let payload: { choices?: Array<{ delta?: StreamDelta }> };
    try {
      payload = JSON.parse(data) as typeof payload;
    } catch {
      return;
    }
    const delta = payload.choices?.[0]?.delta;
    if (!delta) return;
    if (delta.content) {
      content += delta.content;
      onDelta?.({ text: delta.content });
    }
    if (delta.reasoning_content) {
      reasoning += delta.reasoning_content;
      onDelta?.({ reasoning: delta.reasoning_content });
    }
    for (const call of delta.tool_calls ?? []) {
      const index = typeof call.index === "number" ? call.index : 0;
      const slot = toolCalls[index] ??= {
        id: "",
        type: "function",
        function: { name: "", arguments: "" },
      };
      if (call.id) slot.id = call.id;
      if (call.function?.name) slot.function.name = call.function.name;
      if (call.function?.arguments) slot.function.arguments += call.function.arguments;
    }
  };

  /** 处理一个以空行分隔的 SSE 块，取其 data 行内容。 */
  const handleBlock = (block: string): void => {
    const data = block.split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    handleData(data);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    // 按空行切分完整事件块，尾部不完整的留在 buffer 等待下一次读取。
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      handleBlock(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
  }
  // 流结束后处理残留的最后一个块（可能以 [DONE] 结尾）。
  if (buffer.trim()) handleBlock(buffer);

  const assembledToolCalls: ModelToolCall[] = toolCalls
    .filter((call) => call.function.name)
    .map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: parseArguments(call.function.arguments),
    }));
  const hasToolCalls = assembledToolCalls.length > 0;
  return {
    content,
    reasoningContent: reasoning || null,
    toolCalls: assembledToolCalls,
    // 原样保留累积的 assistant 消息（含 reasoning_content 与 tool_calls），
    // 多轮对话时直接回传以保持上下文一致；推理模型带 tools 时缺少该字段会报 400。
    assistantMessage: {
      role: "assistant" as const,
      content: content || null,
      reasoning_content: reasoning || null,
      tool_calls: hasToolCalls
        ? toolCalls
            .filter((call) => call.function.name)
            .map((call) => ({
              id: call.id,
              type: "function" as const,
              function: { name: call.function.name, arguments: call.function.arguments },
            }))
        : undefined,
    },
  };
};
