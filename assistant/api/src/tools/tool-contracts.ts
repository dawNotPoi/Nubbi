import type { MessagePart } from "@nubbi/assistant-shared/contracts";

/** 工具的公共描述，与模型供应商无关。 */
export type ToolDefinition = { name: string; description: string; inputSchema: Record<string, unknown> };
/** 参数只在校验通过后才允许执行；解析错误保留原文用于协议续接。 */
export type ToolArguments =
  | { valid: true; value: Record<string, unknown> }
  | { valid: false; raw: unknown; error: string };
/** 已完成流式组装的一次工具调用。 */
export type ToolCall = { callId: string; toolName: string; input: ToolArguments };
/** 工具的执行结果；指令更新用于本地 Skill 激活。 */
export type ToolExecutionResult = {
  content: string;
  success: boolean;
  parts: MessagePart[];
  instruction?: string;
};
/** 编排器需要的最小工具执行能力。 */
export type ToolInvoker = {
  executeCall: (toolCall: ToolCall) => Promise<ToolExecutionResult>;
  executeCalls: (toolCalls: ToolCall[]) => Promise<PromiseSettledResult<ToolExecutionResult>[]>;
};

/**
 * 校验未知工具参数的基本对象形状，JSON Schema 在执行层继续校验。
 * @param value 协议解码得到的未知参数。
 * @returns 明确区分有效参数与错误，绝不静默填空对象。
 */
export function validateArgumentObject(value: unknown): ToolArguments {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? { valid: true, value: value as Record<string, unknown> }
    : { valid: false, raw: value, error: "工具参数必须是 JSON 对象" };
}
