import { validateArgumentObject } from "../../tools/tool-contracts.ts";
import type { McpTool } from "../mcp/mcp.ts";
import type { MessagePart } from "../../types.ts";
import type { ToolExecutor } from "../../tools/tool-executor.ts";
import { codexClient } from "./client.ts";
import {
  isRecord,
  readString,
  type DynamicToolCallParams,
  type DynamicToolCallResponse,
  type DynamicToolSpec,
} from "./protocol.ts";

type RunContext = {
  parts: MessagePart[];
  gateway: ToolExecutor;
  turnIdentity: Promise<string>;
};

// 以 threadId 为键保存当前 Run 的上下文，供 Codex 发起的工具调用回调使用。
const contexts = new Map<string, RunContext>();
let requestHandlerReady = false;

/**
 * 校验并解析 Codex 动态工具调用的参数。
 * @param value 未知来源的原始参数，需逐个字段校验。
 * @returns 解析成功返回结构化参数，缺少必要字段时返回 null。
 */
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
 * 处理 Codex 发来的工具调用：交给 ToolExecutor 走“校验 → 审批 → 执行”链路，
 * 并把工具执行产生的 MessagePart 收集进当前 Run，最终随助手消息一起落库。
 * @param params Codex 发来的动态工具调用参数。
 * @returns 回传给 Codex 的执行结果（内容与成功标记）。
 */
const handleDynamicTool = async (params: unknown): Promise<DynamicToolCallResponse> => {
  const call = parseToolCall(params);
  if (!call) throw new Error("Codex 动态工具参数无效");
  const context = contexts.get(call.threadId);
  if (!context) throw new Error(`工具 ${call.tool} 当前不可用`);
  if (call.turnId !== (await context.turnIdentity)) throw new Error("Codex 工具请求不属于当前轮次");
  const result = await context.gateway.executeCall({
    callId: call.callId,
    toolName: call.tool,
    input: validateArgumentObject(call.arguments),
  });
  context.parts.push(...result.parts);
  return {
    contentItems: [{ type: "inputText", text: result.content }],
    success: result.success,
  };
};

/**
 * 注册 Codex 服务端请求处理器（只允许工具调用一类请求），只安装一次。
 * @returns 无返回值。
 */
export const installDynamicToolHandler = (): void => {
  if (requestHandlerReady) return;
  codexClient.setServerRequestHandler(async (method, params) => {
    if (method === "item/tool/call") return handleDynamicTool(params);
    throw new Error(`Assistant 不允许 Codex 请求 ${method}`);
  });
  requestHandlerReady = true;
};

/**
 * 把 MCP 工具转换为 Codex 动态工具定义，随 thread/start 一起传给 Codex。
 * @param tools MCP 工具列表。
 * @returns 对应的动态工具定义数组。
 */
export const toDynamicTools = (tools: McpTool[]): DynamicToolSpec[] =>
  tools.map((tool) => ({
    type: "function",
    name: tool.registeredName,
    description: tool.definition.description,
    inputSchema: tool.definition.inputSchema,
  }));

/**
 * 绑定 Run 上下文到指定线程，Codex 发起工具调用时据此找到对应 gateway。
 * @param threadId Codex 线程 ID。
 * @param gateway 该 Run 使用的工具网关。
 * @param parts 用于收集工具执行记录的目标数组。
 * @param turnIdentity 当前轮次启动完成后的身份。
 * @returns 无返回值。
 */
export const registerDynamicToolContext = (
  threadId: string,
  gateway: ToolExecutor,
  parts: MessagePart[],
  turnIdentity: Promise<string>,
): void => {
  contexts.set(threadId, { gateway, parts, turnIdentity });
};

/**
 * Run 结束前解除线程与上下文的绑定，避免上下文泄漏到下一个 Run。
 * @param threadId Codex 线程 ID。
 * @returns 无返回值。
 */
export const removeDynamicToolContext = (threadId: string): void => {
  contexts.delete(threadId);
};
