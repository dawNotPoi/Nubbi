import {
  DELTA_EVENT_TYPES,
  type AgentEvent,
  type MessagePart,
  type TokenUsage,
} from "@nubbi/assistant-shared/contracts";
import type {
  ModelAdapter,
  ModelMessage,
  ModelTurnResult,
} from "../llm/model-adapter.ts";
import type { ToolDefinition, ToolInvoker } from "../tools/tool-contracts.ts";
import type { RunUsage } from "./run-usage.ts";

/** 协议无关循环的完整依赖，不含连接配置、数据库或 MCP 客户端。 */
export type AgentLoopInput = {
  modelAdapter: ModelAdapter;
  toolInvoker: ToolInvoker;
  toolDefinitions: ToolDefinition[];
  instructions: string;
  messages: ModelMessage[];
  abortSignal: AbortSignal;
  publishEvent: (event: AgentEvent) => void;
  runUsage: RunUsage;
};
/** 执行器的最终结果；运行层负责持久化。 */
export type AgentRunResult = {
  messageParts: MessagePart[];
  usage: TokenUsage | null;
};

// 单次运行允许的最大模型轮次（含工具调用往返），防止模型陷入死循环烧 token。
const MAX_MODEL_TURNS = 8;

/** 一轮模型输出后的走向。 */
type TurnOutcome = "done" | "run-tools";

/**
 * 处理单轮模型的停止原因，校验它与工具调用是否自洽，并给出下一步走向。
 * 停止原因是枚举，用穷尽 switch 集中处理，新增停止原因时由类型检查报错提醒。
 * @param response 单轮模型结果。
 * @returns `done` 表示任务已完成，`run-tools` 表示需执行工具后继续循环。
 */
const resolveStopReason = (response: ModelTurnResult): TurnOutcome => {
  switch (response.stopReason) {
    case "length":
      throw new Error("模型输出达到长度上限，任务尚未完成");
    case "refused":
      throw new Error("模型拒绝了本次请求");
    case "unknown":
      throw new Error("模型未返回可识别的结束原因");
    case "completed":
      // 已声明完成却带回工具调用，说明供应商协议或解析有误。
      if (response.toolCalls.length)
        throw new Error("模型工具调用与结束原因不一致");
      return "done";
    case "tool-calls":
      // 声明要调用工具却没给出调用，继续执行只会空转。
      if (!response.toolCalls.length)
        throw new Error("模型声明了工具调用，但未返回完整调用");
      return "run-tools";
  }
};

/**
 * 编排模型与工具，直到模型完成、失败、取消或达到轮次上限。
 * @param input 适配器、工具执行能力和本次运行上下文。
 * @returns 最终消息内容与累计用量。
 */
export async function runAgentLoop(
  input: AgentLoopInput,
): Promise<AgentRunResult> {
  const messages = [...input.messages];
  const messageParts: MessagePart[] = [];
  for (
    let modelTurnIndex = 0;
    modelTurnIndex < MAX_MODEL_TURNS;
    modelTurnIndex += 1
  ) {
    input.abortSignal.throwIfAborted();
    const modelResponse = await input.modelAdapter.generateTurn({
      instructions: input.instructions,
      messages,
      toolDefinitions: input.toolDefinitions,
      abortSignal: input.abortSignal,
      onDelta: (delta) =>
        input.publishEvent({
          type: DELTA_EVENT_TYPES[delta.type],
          text: delta.text,
        }),
    });
    input.runUsage.add(modelResponse.usage);
    messages.push(modelResponse.message);
    for (const block of modelResponse.message.blocks) {
      if (block.type !== "tool-call")
        messageParts.push({ type: block.type, text: block.text });
    }
    if (resolveStopReason(modelResponse) === "done") {
      if (
        !modelResponse.message.blocks.some(
          (block) => block.type === "text" && block.text.trim(),
        )
      ) {
        const text = "任务已完成。";
        input.publishEvent({ type: "text-delta", text });
        messageParts.push({ type: "text", text });
      }
      return { messageParts, usage: input.runUsage.snapshot() };
    }
    const settledResults = await input.toolInvoker.executeCalls(modelResponse.toolCalls);
    input.abortSignal.throwIfAborted();
    for (const [index, settled] of settledResults.entries()) {
      if (settled.status === "rejected") throw settled.reason;
      const toolCall = modelResponse.toolCalls[index]!;
      const toolResult = settled.value;
      messages.push({
        role: "tool",
        callId: toolCall.callId,
        toolName: toolCall.toolName,
        content: toolResult.content,
        success: toolResult.success,
      });
      messageParts.push(...toolResult.parts);
    }
    // 工具结果先成组回填，再追加指令，保持请求/响应配对完整。
    for (const settled of settledResults) {
      if (settled.status === "fulfilled" && settled.value.instruction)
        messages.push({
          role: "instruction",
          content: settled.value.instruction,
        });
    }
  }
  throw new Error(
    `已达到最大执行轮数（${MAX_MODEL_TURNS}），请缩小问题范围后重试。`,
  );
}
