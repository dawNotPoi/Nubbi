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

// 以 threadId 为键保存当前 Run 的上下文，供 Codex 发起的工具调用回调使用。
const contexts = new Map<string, RunContext>();
let requestHandlerReady = false;

/** 校验并解析 Codex 动态工具调用的参数。 */
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

/**
 * 处理 Codex 发来的工具调用：交给 ToolGateway 走“校验 → 审批 → 执行”链路，
 * 并把工具执行产生的 MessagePart 收集进当前 Run，最终随助手消息一起落库。
 */
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

/** 注册 Codex 服务端请求处理器（只允许工具调用一类请求），只安装一次。 */
export const installDynamicToolHandler = (): void => {
  if (requestHandlerReady) return;
  codexClient.setServerRequestHandler(async (method, params) => {
    if (method === "item/tool/call") return handleDynamicTool(params);
    throw new Error(`Assistant 不允许 Codex 请求 ${method}`);
  });
  requestHandlerReady = true;
};

/** 把 MCP 工具转换为 Codex 动态工具定义，随 thread/start 一起传给 Codex。 */
export const toDynamicTools = (tools: McpTool[]): DynamicToolSpec[] => tools.map((tool) => ({
  type: "function",
  name: tool.modelName,
  description: tool.modelTool.function.description,
  inputSchema: tool.modelTool.function.parameters,
}));

/** 绑定 Run 上下文到指定线程，Codex 发起工具调用时据此找到对应 gateway。 */
export const registerDynamicToolContext = (
  threadId: string,
  gateway: ToolGateway,
  parts: MessagePart[],
): void => {
  contexts.set(threadId, { gateway, parts });
};

/** Run 结束前解除线程与上下文的绑定，避免上下文泄漏到下一个 Run。 */
export const removeDynamicToolContext = (threadId: string): void => {
  contexts.delete(threadId);
};
