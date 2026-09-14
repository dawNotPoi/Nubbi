import { z } from "zod";
import type { TokenUsage } from "@nubbi/assistant-shared/contracts";
import type { ModelMessage, ModelStopReason } from "../model-adapter.ts";
import { validateArgumentObject, type ToolArguments } from "../../tools/tool-contracts.ts";

/** 仅在适配器内部使用的供应商响应结构。 */
export const completionSchema = z.object({
  error: z.object({ message: z.string() }).optional(),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
      prompt_cache_hit_tokens: z.number().optional(),
      prompt_cache_miss_tokens: z.number().optional(),
    })
    .nullable()
    .optional(),
  choices: z
    .array(
      z.object({
        index: z.number().optional(),
        finish_reason: z.string().nullable().optional(),
        delta: z
          .object({
            content: z.string().nullable().optional(),
            reasoning_content: z.string().nullable().optional(),
            refusal: z.string().nullable().optional(),
            tool_calls: z
              .array(
                z.object({
                  index: z.number().int().nonnegative(),
                  id: z.string().optional(),
                  function: z.object({ name: z.string().optional(), arguments: z.string().optional() }).optional(),
                }),
              )
              .optional(),
          })
          .optional(),
        message: z
          .object({
            content: z.string().nullable().optional(),
            reasoning_content: z.string().nullable().optional(),
            refusal: z.string().nullable().optional(),
            tool_calls: z
              .array(
                z.object({
                  id: z.string().min(1),
                  function: z.object({ name: z.string().min(1), arguments: z.string() }),
                }),
              )
              .optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .optional(),
});
/** 经运行时校验的供应商响应。 */
export type CompletionPayload = z.infer<typeof completionSchema>;
/** 当前协议的标识，用于隔离续接元数据。 */
export const CHAT_COMPLETIONS_ADAPTER_ID = "chat-completions";

/**
 * 将参数 JSON 转成显式的成功或失败结果。
 * @param source 模型返回的参数原文。
 * @returns 参数解码结果。
 */
export function parseToolArguments(source: string): ToolArguments {
  try {
    const parsed = validateArgumentObject(JSON.parse(source));
    return parsed.valid ? parsed : { ...parsed, raw: source };
  } catch {
    return { valid: false, raw: source, error: "工具参数不是有效 JSON" };
  }
}

/**
 * 转换供应商报告的精确用量，不从字符数推算。
 * @param usage 供应商用量字段。
 * @returns 精确用量，未报告时为 null。
 */
export function readCompletionUsage(usage: CompletionPayload["usage"]): TokenUsage | null {
  return usage
    ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        promptCacheHitTokens: usage.prompt_cache_hit_tokens,
        promptCacheMissTokens: usage.prompt_cache_miss_tokens,
      }
    : null;
}

/**
 * 映射供应商结束原因。
 * @param reason 原始 finish_reason。
 * @returns 编排器理解的停止原因。
 */
export function readStopReason(reason: string | null | undefined): ModelStopReason {
  if (reason === "stop") return "completed";
  if (reason === "tool_calls") return "tool-calls";
  if (reason === "length") return "length";
  if (reason === "content_filter") return "refused";
  return "unknown";
}

/**
 * 把公共消息转换为 Chat Completions 消息，续接数据只由本适配器解释。
 * @param message 统一消息。
 * @returns 供应商请求字段。
 */
export function serializeMessage(message: ModelMessage): Record<string, unknown> {
  if (message.role === "instruction") return { role: "system", content: message.content };
  if (message.role === "user") return message;
  if (message.role === "tool") return { role: "tool", tool_call_id: message.callId, content: message.content };
  if (message.continuation?.adapterId === CHAT_COMPLETIONS_ADAPTER_ID) {
    const raw = message.continuation.data;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...raw, role: "assistant" };
  }
  const text = message.blocks
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  const reasoning = message.blocks
    .filter((block) => block.type === "reasoning")
    .map((block) => block.text)
    .join("");
  const toolCalls = message.blocks.flatMap((block) =>
    block.type === "tool-call"
      ? [
          {
            id: block.toolCall.callId,
            type: "function",
            function: {
              name: block.toolCall.toolName,
              arguments: block.toolCall.input.valid
                ? JSON.stringify(block.toolCall.input.value)
                : String(block.toolCall.input.raw),
            },
          },
        ]
      : [],
  );
  return {
    role: "assistant",
    content: text || null,
    reasoning_content: reasoning || undefined,
    tool_calls: toolCalls.length ? toolCalls : undefined,
  };
}
