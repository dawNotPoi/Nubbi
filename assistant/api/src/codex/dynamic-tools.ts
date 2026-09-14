import type { McpTool } from "../mcp.js";
import type { MessagePart } from "../types.js";
import type { ToolGateway } from "../runtime/tool-gateway.js";
import { codexClient } from "./client.js";
import {
  isRecord,
  readString,
  type DynamicToolCallParams,
  type DynamicToolCallResponse,
  type DynamicToolSpec,
} from "./protocol.js";

type RunContext = {
  parts: MessagePart[];
  gateway: ToolGateway;
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
  if (!context) throw new Error(`工具 ${call.tool} 当前不可用`);
  const result = await context.gateway.execute({
    id: call.callId,
    name: call.tool,
    arguments: isRecord(call.arguments) ? call.arguments : {},
  });
  context.parts.push(...result.parts);
  return {
    contentItems: [{ type: "inputText", text: result.content }],
    success: result.success,
  };
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
  gateway: ToolGateway,
  parts: MessagePart[],
): void => {
  contexts.set(threadId, { gateway, parts });
};

export const removeDynamicToolContext = (threadId: string): void => {
  contexts.delete(threadId);
};
