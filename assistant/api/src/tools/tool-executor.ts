import type { AgentEvent, MessagePart } from "@nubbi/assistant-shared/contracts";
import { requestApproval } from "./approvals.ts";
import { createToolRegistry, type RegisteredTool } from "./registry.ts";
import { ToolScheduler } from "./scheduler.ts";
import { validateToolInput } from "./validation.ts";
import type { ToolCall, ToolExecutionResult, ToolInvoker } from "./tool-contracts.ts";

/** 工具执行所需依赖，由运行组装层提供。 */
export type ToolExecutorInput = {
  runId: string;
  registeredTools: RegisteredTool[];
  publishEvent: (event: AgentEvent) => void;
  abortSignal: AbortSignal;
};

/** 参数校验、审批与调度的统一入口；不识别模型协议或 MCP 传输。 */
export class ToolExecutor implements ToolInvoker {
  private readonly registry: ReadonlyMap<string, RegisteredTool>;
  private readonly readScheduler = new ToolScheduler(4);
  private readonly writeScheduler = new ToolScheduler(1);
  private readonly skillScheduler = new ToolScheduler(1);

  /**
   * 建立单次运行的工具执行入口。
   * @param dependencies 工具注册表、事件与取消能力。
   */
  public constructor(private readonly dependencies: ToolExecutorInput) {
    this.registry = createToolRegistry(dependencies.registeredTools);
  }

  /**
   * 调度一次调用；工具不存在或参数非法时不审批、不执行。
   * @param toolCall 完整的工具调用。
   * @returns 包含展示记录的执行结果。
   */
  public async executeCall(toolCall: ToolCall): Promise<ToolExecutionResult> {
    this.dependencies.abortSignal.throwIfAborted();
    const tool = this.registry.get(toolCall.toolName);
    if (!tool) return this.recordResult(toolCall, undefined, "未知工具", false);
    const inputError = validateToolInput(tool.definition, toolCall.input);
    if (inputError)
      return this.recordResult(
        toolCall,
        tool,
        JSON.stringify({ success: false, error: "invalid_tool_arguments", message: inputError }),
        false,
      );
    const scheduler =
      tool.presentation === "skill" ? this.skillScheduler : tool.readOnly ? this.readScheduler : this.writeScheduler;
    return scheduler.schedule(() => this.invokeTool(toolCall, tool), this.dependencies.abortSignal);
  }

  /** 校验后的调用按统一审批策略执行；取消不能转换为普通工具失败。 */
  private async invokeTool(toolCall: ToolCall, tool: RegisteredTool): Promise<ToolExecutionResult> {
    const { abortSignal, publishEvent, runId } = this.dependencies;
    abortSignal.throwIfAborted();
    if (!toolCall.input.valid) throw new Error("工具参数未通过校验");
    const argumentsValue = toolCall.input.value;
    const approvalParts: MessagePart[] = [];
    if (!tool.readOnly) {
      const approval = await requestApproval({
        runId,
        abortSignal,
        server: tool.serverName,
        tool: tool.originalName,
        arguments: previewArguments(argumentsValue),
        emit: publishEvent,
        review: tool.buildApprovalReview?.(previewArguments(argumentsValue)),
      });
      abortSignal.throwIfAborted();
      approvalParts.push({
        type: "approval",
        approvalId: approval.approvalId,
        server: tool.serverName,
        tool: tool.originalName,
        arguments: previewArguments(argumentsValue),
        approved: approval.approved,
      });
      if (!approval.approved)
        return this.recordResult(
          toolCall,
          tool,
          JSON.stringify({ success: false, error: "user_denied" }),
          false,
          approvalParts,
        );
    }
    if (tool.presentation !== "skill")
      publishEvent({
        type: "tool-start",
        callId: toolCall.callId,
        server: tool.serverName,
        tool: tool.originalName,
        arguments: previewArguments(argumentsValue),
      });
    const startedAt = Date.now();
    try {
      const toolResult = await tool.invoke({ arguments: argumentsValue, abortSignal });
      abortSignal.throwIfAborted();
      if (tool.presentation === "skill") return { ...toolResult, parts: toolResult.parts ?? [] };
      const recorded = this.recordResult(
        toolCall,
        tool,
        toolResult.content,
        toolResult.success,
        [...approvalParts, ...(toolResult.parts ?? [])],
        Date.now() - startedAt,
      );
      return { ...recorded, instruction: toolResult.instruction };
    } catch (error) {
      abortSignal.throwIfAborted();
      return this.recordResult(
        toolCall,
        tool,
        JSON.stringify({
          success: false,
          error: "tool_execution_failed",
          message: error instanceof Error ? error.message : "工具执行失败",
        }),
        false,
        approvalParts,
        Date.now() - startedAt,
      );
    }
  }

  /** 统一生成事件与持久化记录，确保失败调用在两端同样可见。 */
  private recordResult(
    toolCall: ToolCall,
    tool: RegisteredTool | undefined,
    content: string,
    success: boolean,
    previousParts: MessagePart[] = [],
    durationMs?: number,
  ): ToolExecutionResult {
    const result = content.slice(0, 2_000);
    const server = tool?.serverName ?? "assistant";
    const toolName = tool?.originalName ?? toolCall.toolName;
    this.dependencies.publishEvent({
      type: "tool-result",
      callId: toolCall.callId,
      server,
      tool: toolName,
      result,
      success,
      durationMs,
    });
    return {
      content: content.slice(0, 30_000),
      success,
      parts: [
        ...previousParts,
        {
          type: "tool",
          callId: toolCall.callId,
          server,
          tool: toolName,
          arguments: toolCall.input.valid
            ? previewArguments(toolCall.input.value)
            : { invalidInput: toolCall.input.raw },
          result,
          success,
          durationMs,
        },
      ],
    };
  }
}

/**
 * 限制工具参数展示体积，实际执行仍使用完整参数。
 * @param argumentsValue 工具参数。
 * @returns 可展示的对象。
 */
function previewArguments(argumentsValue: Record<string, unknown>): Record<string, unknown> {
  const text = JSON.stringify(argumentsValue);
  return text.length <= 20_000 ? argumentsValue : { preview: text.slice(0, 20_000), truncated: true };
}
