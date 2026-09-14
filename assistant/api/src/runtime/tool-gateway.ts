import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation";
import { requestApproval } from "../approvals.js";
import { callMcpTool, type McpTool } from "../mcp.js";
import type { AgentEvent, MessagePart, ModelToolCall } from "../types.js";

const modelResultLimit = 30_000;
const displayResultLimit = 2_000;
const displayArgumentsLimit = 20_000;
const validatorProvider = new AjvJsonSchemaValidator();

export type ToolExecutionResult = {
  content: string;
  parts: MessagePart[];
  success: boolean;
};

const displayArguments = (value: Record<string, unknown>): Record<string, unknown> => {
  const source = JSON.stringify(value);
  if (source.length <= displayArgumentsLimit) return value;
  return { preview: source.slice(0, displayArgumentsLimit), truncated: true };
};

const errorContent = (error: string, message: string): string =>
  JSON.stringify({ success: false, error, message });

export class ToolGateway {
  private readonly tools: Map<string, McpTool>;
  private readonly runId: string;
  private readonly emit: (event: AgentEvent) => void;
  private readonly signal: AbortSignal;
  private readActive = 0;
  private readonly readWaiters: Array<() => void> = [];
  private writeQueue: Promise<void> = Promise.resolve();

  public constructor(input: {
    runId: string;
    tools: McpTool[];
    emit: (event: AgentEvent) => void;
    signal: AbortSignal;
  }) {
    this.runId = input.runId;
    this.tools = new Map(input.tools.map((tool) => [tool.modelName, tool]));
    this.emit = input.emit;
    this.signal = input.signal;
  }

  public isReadOnly(toolName: string): boolean {
    const annotations = this.tools.get(toolName)?.annotations;
    return annotations?.readOnlyHint === true && annotations.destructiveHint !== true;
  }

  public executeMany(calls: ModelToolCall[]): Promise<ToolExecutionResult[]> {
    return Promise.all(calls.map((call) => this.execute(call)));
  }

  public execute(call: ModelToolCall): Promise<ToolExecutionResult> {
    const operation = () => this.executeNow(call);
    if (this.isReadOnly(call.name)) return this.withReadSlot(operation);
    const pending = this.writeQueue.then(operation, operation);
    this.writeQueue = pending.then(() => undefined, () => undefined);
    return pending;
  }

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
    if (!this.isReadOnly(call.name)) {
      const approval = await requestApproval({
        threadId: this.runId,
        server: tool.server.name,
        tool: tool.originalName,
        arguments: shownArguments,
        emit: this.emit,
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
    try {
      const result = await callMcpTool(tool, call.arguments, this.signal);
      const content = result.content.slice(0, modelResultLimit);
      const shownResult = content.slice(0, displayResultLimit);
      this.emit({
        type: "tool-result",
        callId: call.id,
        server: tool.server.name,
        tool: tool.originalName,
        result: shownResult,
        success: result.success,
      });
      parts.push(this.toolPart(call, tool, shownArguments, shownResult, result.success));
      return { content, parts, success: result.success };
    } catch (error) {
      const message = error instanceof Error ? error.message : "MCP 工具执行失败";
      return this.failure(
        call,
        tool,
        shownArguments,
        errorContent("tool_execution_failed", message),
        parts,
      );
    }
  }

  private failure(
    call: ModelToolCall,
    tool: McpTool,
    argumentsValue: Record<string, unknown>,
    content: string,
    parts: MessagePart[] = [],
  ): ToolExecutionResult {
    const shownResult = content.slice(0, displayResultLimit);
    this.emit({
      type: "tool-result",
      callId: call.id,
      server: tool.server.name,
      tool: tool.originalName,
      result: shownResult,
      success: false,
    });
    parts.push(this.toolPart(call, tool, argumentsValue, shownResult, false));
    return { content, parts, success: false };
  }

  private toolPart(
    call: ModelToolCall,
    tool: McpTool,
    argumentsValue: Record<string, unknown>,
    result: string,
    success: boolean,
  ): MessagePart {
    return {
      type: "tool",
      callId: call.id,
      server: tool.server.name,
      tool: tool.originalName,
      arguments: argumentsValue,
      result,
      success,
    };
  }
}
