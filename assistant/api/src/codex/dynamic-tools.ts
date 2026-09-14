import { requestApproval } from "../approvals.js";
import { callMcpTool, type McpTool } from "../mcp.js";
import type { AgentEvent, MessagePart } from "../types.js";
import { codexClient } from "./client.js";
import {
  isRecord,
  readString,
  type DynamicToolCallParams,
  type DynamicToolCallResponse,
  type DynamicToolSpec,
} from "./protocol.js";

type RunContext = {
  emit: (event: AgentEvent) => void;
  parts: MessagePart[];
  tools: Map<string, McpTool>;
};

const contexts = new Map<string, RunContext>();
let requestHandlerReady = false;

const parseToolCall = (value: unknown): DynamicToolCallParams | null => {
  const threadId = readString(value, "threadId");
  const turnId = readString(value, "turnId");
  const callId = readString(value, "callId");
  const tool = readString(value, "tool");
  if (!threadId || !turnId || !callId || !tool || !isRecord(value)) return null;
  return {
    threadId,
    turnId,
    callId,
    tool,
    namespace: typeof value.namespace === "string" ? value.namespace : null,
    arguments: value.arguments,
  };
};

const handleDynamicTool = async (params: unknown): Promise<DynamicToolCallResponse> => {
  const call = parseToolCall(params);
  if (!call) throw new Error("Codex 动态工具参数无效");
  const context = contexts.get(call.threadId);
  const tool = context?.tools.get(call.tool);
  if (!context || !tool) throw new Error(`工具 ${call.tool} 不可用`);
  const argumentsValue = isRecord(call.arguments) ? call.arguments : {};
  const approval = await requestApproval({
    threadId: call.threadId,
    server: tool.server.name,
    tool: tool.originalName,
    arguments: argumentsValue,
    emit: context.emit,
  });
  context.parts.push({
    type: "approval",
    approvalId: approval.approvalId,
    server: tool.server.name,
    tool: tool.originalName,
    arguments: argumentsValue,
    approved: approval.approved,
  });
  if (!approval.approved) {
    return {
      contentItems: [{ type: "inputText", text: "用户拒绝了这次工具调用。" }],
      success: false,
    };
  }
  context.emit({
    type: "tool-start",
    server: tool.server.name,
    tool: tool.originalName,
    arguments: argumentsValue,
  });
  try {
    const result = await callMcpTool(tool, argumentsValue);
    const clipped = result.slice(0, 2_000);
    context.parts.push({
      type: "tool",
      server: tool.server.name,
      tool: tool.originalName,
      arguments: argumentsValue,
      result: clipped,
    });
    context.emit({
      type: "tool-result",
      server: tool.server.name,
      tool: tool.originalName,
      result: clipped,
    });
    return { contentItems: [{ type: "inputText", text: result }], success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP 工具执行失败";
    context.parts.push({
      type: "tool",
      server: tool.server.name,
      tool: tool.originalName,
      arguments: argumentsValue,
      result: message,
    });
    context.emit({
      type: "tool-result",
      server: tool.server.name,
      tool: tool.originalName,
      result: message,
    });
    return { contentItems: [{ type: "inputText", text: message }], success: false };
  }
};

export const installDynamicToolHandler = (): void => {
  if (requestHandlerReady) return;
  codexClient.setServerRequestHandler(async (method, params) => {
    if (method === "item/tool/call") return handleDynamicTool(params);
    throw new Error(`Assistant 不允许 Codex 请求 ${method}`);
  });
  requestHandlerReady = true;
};

export const toDynamicTools = (tools: McpTool[]): DynamicToolSpec[] => tools.map((tool) => ({
  type: "function",
  name: tool.modelName,
  description: tool.modelTool.function.description,
  inputSchema: tool.modelTool.function.parameters,
}));

export const registerDynamicToolContext = (
  threadId: string,
  tools: McpTool[],
  parts: MessagePart[],
  emit: (event: AgentEvent) => void,
): void => {
  contexts.set(threadId, {
    emit,
    parts,
    tools: new Map(tools.map((tool) => [tool.modelName, tool])),
  });
};

export const removeDynamicToolContext = (threadId: string): void => {
  contexts.delete(threadId);
};
