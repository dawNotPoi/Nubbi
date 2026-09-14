import type { DeltaType, TokenUsage } from "@nubbi/assistant-shared/contracts";
import type { ToolCall, ToolDefinition } from "../tools/tool-contracts.ts";

/** 模型输出的有序内容块；私有协议数据不放入内容块。 */
export type ModelContentBlock =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-call"; toolCall: ToolCall };
/** 不依赖供应商协议的模型历史消息。 */
export type ModelMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; blocks: ModelContentBlock[]; continuation?: { adapterId: string; data: unknown } }
  | { role: "tool"; callId: string; toolName: string; content: string; success: boolean }
  | { role: "instruction"; content: string };
/** 单轮模型停止的原因；未知停止不等于成功。 */
export type ModelStopReason = "completed" | "tool-calls" | "length" | "refused" | "unknown";
/** 单轮模型结果，不包含整个 Agent 的执行结果。 */
export type ModelTurnResult = {
  message: Extract<ModelMessage, { role: "assistant" }>;
  toolCalls: ToolCall[];
  stopReason: ModelStopReason;
  usage: TokenUsage | null;
};
/** 已解码的可展示内容增量。 */
export type ModelDelta = { type: DeltaType; text: string };
/** 模型单轮输入；连接参数在创建适配器时绑定。 */
export type ModelTurnInput = {
  instructions: string;
  messages: ModelMessage[];
  toolDefinitions: ToolDefinition[];
  abortSignal: AbortSignal;
  onDelta: (delta: ModelDelta) => void;
};
/** Agent 仅依赖此契约，供应商实现只完成一次模型请求。 */
export interface ModelAdapter {
  /**
   * 生成一轮模型回复。
   * @param input 消息、工具与取消及增量回调。
   * @returns 标准化单轮结果。
   */
  generateTurn(input: ModelTurnInput): Promise<ModelTurnResult>;
}
