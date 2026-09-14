import type { AgentEvent, MessagePart, TokenUsage } from "@nubbi/assistant-shared/contracts";
import type { ModelAdapter, ModelMessage } from "../llm/model-adapter.ts";
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
export type AgentRunResult = { messageParts: MessagePart[]; usage: TokenUsage | null };

/**
 * 编排模型与工具，直到模型完成、失败、取消或达到轮次上限。
 * @param input 适配器、工具执行能力和本次运行上下文。
 * @returns 最终消息内容与累计用量。
 */
export async function runAgentLoop(input: AgentLoopInput): Promise<AgentRunResult> {
  const messages = [...input.messages];
  const messageParts: MessagePart[] = [];
  for (let modelTurnIndex = 0; modelTurnIndex < 8; modelTurnIndex += 1) {
    input.abortSignal.throwIfAborted();
    const modelResponse = await input.modelAdapter.generateTurn({
      instructions: input.instructions,
      messages,
      toolDefinitions: input.toolDefinitions,
      abortSignal: input.abortSignal,
      onDelta: (delta) =>
        input.publishEvent({ type: delta.type === "text" ? "text-delta" : "reasoning-delta", text: delta.text }),
    });
    input.runUsage.add(modelResponse.usage);
    messages.push(modelResponse.message);
    for (const block of modelResponse.message.blocks) {
      if (block.type !== "tool-call") messageParts.push({ type: block.type, text: block.text });
    }
    if (modelResponse.stopReason === "length") throw new Error("模型输出达到长度上限，任务尚未完成");
    if (modelResponse.stopReason === "refused") throw new Error("模型拒绝了本次请求");
    if (modelResponse.stopReason === "unknown") throw new Error("模型未返回可识别的结束原因");
    if (!modelResponse.toolCalls.length) {
      if (modelResponse.stopReason !== "completed") throw new Error("模型声明了工具调用，但未返回完整调用");
      if (!modelResponse.message.blocks.some((block) => block.type === "text" && block.text.trim())) {
        const text = "任务已完成。";
        input.publishEvent({ type: "text-delta", text });
        messageParts.push({ type: "text", text });
      }
      return { messageParts, usage: input.runUsage.snapshot() };
    }
    if (modelResponse.stopReason !== "tool-calls") throw new Error("模型工具调用与结束原因不一致");
    const settledResults = await Promise.allSettled(
      modelResponse.toolCalls.map((toolCall) => input.toolInvoker.executeCall(toolCall)),
    );
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
        messages.push({ role: "instruction", content: settled.value.instruction });
    }
  }
  throw new Error("已达到最大执行轮数，请缩小问题范围后重试。");
}
