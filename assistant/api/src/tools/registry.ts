import type { ApprovalReview, MessagePart } from "@nubbi/assistant-shared/contracts";
import type { ToolDefinition, ToolExecutionResult } from "./tool-contracts.ts";

/** 工具执行上下文，取消信号必须传到实际传输层。 */
export type ToolInvocation = { arguments: Record<string, unknown>; abortSignal: AbortSignal };
/** 一个工具的定义、审批策略和实际实现，均不依赖模型协议。 */
export type RegisteredTool = {
  definition: ToolDefinition;
  serverName: string;
  originalName: string;
  readOnly: boolean;
  presentation?: "skill";
  buildApprovalReview?: (argumentsValue: Record<string, unknown>) => ApprovalReview | undefined;
  invoke: (input: ToolInvocation) => Promise<Omit<ToolExecutionResult, "parts"> & { parts?: MessagePart[] }>;
};

/**
 * 创建工具索引，发现名称碰撞时拒绝覆盖。
 * @param registeredTools 本次运行可用的工具。
 * @returns 按模型可见名称索引的工具表。
 */
export function createToolRegistry(registeredTools: RegisteredTool[]): ReadonlyMap<string, RegisteredTool> {
  const registry = new Map<string, RegisteredTool>();
  for (const tool of registeredTools) {
    if (registry.has(tool.definition.name)) throw new Error(`工具名称重复：${tool.definition.name}`);
    registry.set(tool.definition.name, tool);
  }
  return registry;
}
