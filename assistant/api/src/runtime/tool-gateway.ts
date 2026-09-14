import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation";
import { requestApproval } from "./approvals.js";
import { callMcpTool, type McpTool } from "../mcp/mcp.js";
import type { AgentEvent, ApprovalReview, MessagePart, ModelTool, ModelToolCall } from "../types.js";

/** 内置工具名：查询当前会话的模型 prompt 缓存命中率。 */
export const SESSION_CACHE_STATS_TOOL = "assistant_session_cache_stats";

/** 内置工具定义：暴露给模型，返回当前会话累计的缓存命中/未命中 token 与命中率。 */
export const sessionCacheStatsToolDefinition: ModelTool = {
  type: "function",
  function: {
    name: SESSION_CACHE_STATS_TOOL,
    description:
      "查询当前会话（对话）的模型 prompt 缓存命中率。返回 JSON 对象：{ hit_tokens, miss_tokens, hit_rate }，其中 hit_rate 是 0 到 1 的浮点数（如 0.85 表示 85% 命中）。",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
};

const modelResultLimit = 30_000;      // 回传给模型的工具结果上限
const displayResultLimit = 2_000;     // 推送/展示给客户端的工具结果上限
const displayArgumentsLimit = 20_000; // 展示给用户的参数上限
const validatorProvider = new AjvJsonSchemaValidator();

export type ToolExecutionResult = {
  content: string;
  parts: MessagePart[];
  success: boolean;
};

/**
 * 参数过大时只给用户展示截断预览，避免弹窗渲染卡顿。
 * @param value 模型传回的工具调用参数。
 * @returns 原参数对象；超过上限时返回含 preview 与 truncated 标记的对象。
 */
const displayArguments = (value: Record<string, unknown>): Record<string, unknown> => {
  const source = JSON.stringify(value);
  if (source.length <= displayArgumentsLimit) return value;
  return { preview: source.slice(0, displayArgumentsLimit), truncated: true };
};

/**
 * 统一的工具失败 JSON 结构，模型可通过 error 字段判断失败原因。
 * @param error 机器可读的错误码（如 unknown_tool）。
 * @param message 给模型/用户看的错误描述。
 * @returns 序列化后的 JSON 字符串。
 */
const errorContent = (error: string, message: string): string =>
  JSON.stringify({ success: false, error, message });

/**
 * 把未知值转成可展示字符串。
 * @param value 任意值。
 * @returns 字符串形式。
 */
const stringValue = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);

/**
 * 为审批卡片生成结构化评审内容，优先让 Nubbi 笔记类工具展示友好预览。
 * @param tool 目标 MCP 工具。
 * @param args 模型传入的工具参数。
 * @returns 评审内容；非 Nubbi 工具返回 undefined，前端回退为原始 JSON。
 */
const buildApprovalReview = (
  tool: McpTool,
  args: Record<string, unknown>,
): ApprovalReview | undefined => {
  if (tool.originalName === "nubbi_create_note") {
    const details: Array<{ label: string; value: string }> = [];
    if (args.parent_id !== undefined && args.parent_id !== null) {
      details.push({ label: "父笔记", value: stringValue(args.parent_id) });
    }
    if (Array.isArray(args.tags)) {
      details.push({ label: "标签", value: args.tags.join(", ") });
    }
    return {
      operation: "创建笔记",
      title: stringValue(args.title) || "未命名笔记",
      content: stringValue(args.content),
      details,
    };
  }
  if (tool.originalName === "nubbi_edit_note_content") {
    const mode = stringValue(args.mode);
    const content = stringValue(args.content);
    const oldText = stringValue(args.old_text);
    const newText = stringValue(args.new_text);
    const body = content || (oldText ? `替换：${oldText} → ${newText}` : "");
    const details: Array<{ label: string; value: string }> = [
      { label: "笔记 ID", value: stringValue(args.note_id) },
      { label: "编辑模式", value: mode },
      { label: "内容版本", value: stringValue(args.base_content_revision) },
    ].filter((item) => item.value && item.value !== "undefined");
    return {
      operation: "编辑笔记内容",
      title: stringValue(args.title) || undefined,
      content: body,
      details,
    };
  }
  if (tool.originalName.startsWith("nubbi_")) {
    return {
      operation: tool.originalName.replace(/^nubbi_/, ""),
      details: Object.entries(args).map(([key, value]) => ({
        label: key,
        value: stringValue(value),
      })),
    };
  }
  return undefined;
};

export class ToolGateway {
  private readonly tools: Map<string, McpTool>;
  private readonly runId: string;
  private readonly emit: (event: AgentEvent) => void;
  private readonly signal: AbortSignal;
  // 当前会话的缓存统计读取函数，由会话层注入（持久化累计 + 当前 Run 实时累计）。
  private readonly sessionStats?: () => Promise<{ hitTokens: number; missTokens: number }>;
  private readActive = 0;
  private readonly readWaiters: Array<() => void> = [];
  private writeQueue: Promise<void> = Promise.resolve();

  /**
   * 创建工具网关实例。
   * @param input 网关依赖：Run ID、MCP 工具列表、事件回调、取消信号与会话统计读取函数。
   */
  public constructor(input: {
    runId: string;
    tools: McpTool[];
    emit: (event: AgentEvent) => void;
    signal: AbortSignal;
    sessionStats?: () => Promise<{ hitTokens: number; missTokens: number }>;
  }) {
    this.runId = input.runId;
    this.tools = new Map(input.tools.map((tool) => [tool.modelName, tool]));
    this.emit = input.emit;
    this.signal = input.signal;
    this.sessionStats = input.sessionStats;
  }

  /**
   * 依据 MCP 注解判断工具是否只读：只读工具可并行，可并行执行上限 4 个。
   * @param toolName 模型的工具名（已加 serverId 前缀）。
   * @returns 工具为只读（无破坏性且标记 readOnlyHint）返回 true。
   */
  public isReadOnly(toolName: string): boolean {
    const annotations = this.tools.get(toolName)?.annotations;
    return annotations?.readOnlyHint === true && annotations.destructiveHint !== true;
  }

  /**
   * 并发执行一批工具调用。
   * @param calls 待执行的工具调用列表。
   * @returns 每个调用的执行结果数组，顺序与 calls 一致。
   */
  public executeMany(calls: ModelToolCall[]): Promise<ToolExecutionResult[]> {
    return Promise.all(calls.map((call) => this.execute(call)));
  }

  /**
   * 调度一次工具执行：
   * - 内置会话统计工具直接执行，不走 MCP；
   * - 只读工具通过 withReadSlot 并发执行（上限 4）；
   * - 写操作串行排队，避免并发工具间相互覆盖状态。
   * @param call 模型发起的工具调用。
   * @returns 本次工具执行的结果，包含回传模型的 content 与收集的 parts。
   */
  public execute(call: ModelToolCall): Promise<ToolExecutionResult> {
    if (call.name === SESSION_CACHE_STATS_TOOL) {
      return this.sessionCacheStats(call);
    }
    const operation = () => this.executeNow(call);
    if (this.isReadOnly(call.name)) return this.withReadSlot(operation);
    const pending = this.writeQueue.then(operation, operation);
    this.writeQueue = pending.then(() => undefined, () => undefined);
    return pending;
  }

  /**
   * 执行内置会话缓存统计查询：汇总持久化累计与当前 Run 实时累计，
   * 返回命中/未命中 token 与浮点命中率；无任何缓存数据时命中率返回 0。
   * @param call 模型发起的工具调用（携带调用 ID 用于关联事件与 part）。
   * @returns 包含 JSON 统计结果的成功执行结果。
   */
  private async sessionCacheStats(call: ModelToolCall): Promise<ToolExecutionResult> {
    const stats = this.sessionStats
      ? await this.sessionStats()
      : { hitTokens: 0, missTokens: 0 };
    const total = stats.hitTokens + stats.missTokens;
    const hitRate = total > 0 ? stats.hitTokens / total : 0;
    const content = JSON.stringify({
      hit_tokens: stats.hitTokens,
      miss_tokens: stats.missTokens,
      hit_rate: hitRate,
    });
    this.emit({
      type: "tool-start",
      callId: call.id,
      server: "assistant",
      tool: SESSION_CACHE_STATS_TOOL,
      arguments: {},
    });
    this.emit({
      type: "tool-result",
      callId: call.id,
      server: "assistant",
      tool: SESSION_CACHE_STATS_TOOL,
      result: content,
      success: true,
      durationMs: 0,
    });
    const part: MessagePart = {
      type: "tool",
      callId: call.id,
      server: "assistant",
      tool: SESSION_CACHE_STATS_TOOL,
      arguments: {},
      result: content,
      success: true,
      durationMs: 0,
    };
    return { content, parts: [part], success: true };
  }

  /**
   * 只读并发槽：超过 4 个时排队等待，限制对远程 MCP 服务的并发压力。
   * @param operation 实际执行工具的回调。
   * @returns operation 的执行结果。
   */
  private async withReadSlot<T>(operation: () => Promise<T>): Promise<T> {
    if (this.readActive >= 4) {
      await new Promise<void>((resolve) => this.readWaiters.push(resolve));
    }
    this.readActive += 1;
    try {
      return await operation();
    } finally {
      this.readActive -= 1;
      this.readWaiters.shift()?.();
    }
  }

  /**
   * 按工具声明的 JSON Schema 校验参数，避免把非法参数传给远端 MCP 服务。
   * @param tool 目标 MCP 工具，含其声明的参数 Schema。
   * @param value 模型传回的工具调用参数。
   * @returns 校验失败时返回错误信息，通过时返回 null。
   */
  private validate(tool: McpTool, value: Record<string, unknown>): string | null {
    try {
      const validator = validatorProvider.getValidator<Record<string, unknown>>(
        tool.modelTool.function.parameters as JsonSchemaType,
      );
      const result = validator(value);
      return result.valid ? null : result.errorMessage;
    } catch (error) {
      return error instanceof Error ? error.message : "工具参数 Schema 无法解析";
    }
  }

  /**
   * 实际执行一次工具调用：校验、审批、调用 MCP 并收集 parts。
   * @param call 模型发起的工具调用。
   * @returns 执行结果，包括回传模型的 content、收集的 parts 与成功标记。
   */
  private async executeNow(call: ModelToolCall): Promise<ToolExecutionResult> {
    this.signal.throwIfAborted();
    const tool = this.tools.get(call.name);
    if (!tool) {
      return { content: errorContent("unknown_tool", `未知工具：${call.name}`), parts: [], success: false };
    }
    const shownArguments = displayArguments(call.arguments);
    const invalid = this.validate(tool, call.arguments);
    if (invalid) {
      return this.failure(call, tool, shownArguments, errorContent("invalid_tool_arguments", invalid));
    }

    const parts: MessagePart[] = [];
    // 非只读工具必须先获得用户审批，避免任意修改外部系统。
    if (!this.isReadOnly(call.name)) {
      const approval = await requestApproval({
        threadId: this.runId,
        server: tool.server.name,
        tool: tool.originalName,
        arguments: shownArguments,
        emit: this.emit,
        review: buildApprovalReview(tool, shownArguments),
      });
      parts.push({
        type: "approval",
        approvalId: approval.approvalId,
        server: tool.server.name,
        tool: tool.originalName,
        arguments: shownArguments,
        approved: approval.approved,
      });
      if (!approval.approved) {
        const content = JSON.stringify({ success: false, error: "user_denied" });
        return this.failure(call, tool, shownArguments, content, parts);
      }
      this.signal.throwIfAborted();
    }

    this.emit({
      type: "tool-start",
      callId: call.id,
      server: tool.server.name,
      tool: tool.originalName,
      arguments: shownArguments,
    });
    // 耗时只统计工具实际执行（callMcpTool），不含审批等待与参数校验。
    const startedAt = Date.now();
    try {
      const result = await callMcpTool(tool, call.arguments, this.signal);
      const durationMs = Date.now() - startedAt;
      const content = result.content.slice(0, modelResultLimit);
      const shownResult = content.slice(0, displayResultLimit);
      this.emit({
        type: "tool-result",
        callId: call.id,
        server: tool.server.name,
        tool: tool.originalName,
        result: shownResult,
        success: result.success,
        durationMs,
      });
      parts.push(this.toolPart(call, tool, shownArguments, shownResult, result.success, durationMs));
      return { content, parts, success: result.success };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : "MCP 工具执行失败";
      return this.failure(
        call,
        tool,
        shownArguments,
        errorContent("tool_execution_failed", message),
        parts,
        durationMs,
      );
    }
  }

  /**
   * 统一记录工具失败：推送 tool-result 事件并返回失败结果。
   * @param call 原始工具调用。
   * @param tool 目标 MCP 工具。
   * @param argumentsValue 展示给用户的参数（可能已截断）。
   * @param content 回传给模型的失败内容。
   * @param parts 追加失败记录的目标 parts 数组。
   * @returns 失败的工具执行结果。
   */
  private failure(
    call: ModelToolCall,
    tool: McpTool,
    argumentsValue: Record<string, unknown>,
    content: string,
    parts: MessagePart[] = [],
    durationMs?: number,
  ): ToolExecutionResult {
    const shownResult = content.slice(0, displayResultLimit);
    this.emit({
      type: "tool-result",
      callId: call.id,
      server: tool.server.name,
      tool: tool.originalName,
      result: shownResult,
      success: false,
      durationMs,
    });
    parts.push(this.toolPart(call, tool, argumentsValue, shownResult, false, durationMs));
    return { content, parts, success: false };
  }

  /**
   * 构造工具执行结果对应的 MessagePart。
   * @param call 原始工具调用。
   * @param tool 目标 MCP 工具。
   * @param argumentsValue 展示给用户的参数（可能已截断）。
   * @param result 工具返回的结果文本。
   * @param success 是否执行成功。
   * @returns 类型为 tool 的 MessagePart。
   */
  private toolPart(
    call: ModelToolCall,
    tool: McpTool,
    argumentsValue: Record<string, unknown>,
    result: string,
    success: boolean,
    durationMs?: number,
  ): MessagePart {
    return {
      type: "tool",
      callId: call.id,
      server: tool.server.name,
      tool: tool.originalName,
      arguments: argumentsValue,
      result,
      success,
      durationMs,
    };
  }
}
