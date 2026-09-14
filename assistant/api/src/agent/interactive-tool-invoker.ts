import { ASK_USER_TOOL_NAME, type AgentEvent } from "@nubbi/assistant-shared/contracts";
import { askUserSchema } from "../features/user-input/user-input.schema.ts";
import { userInputService, type UserInputService } from "../features/user-input/user-input.service.ts";
import type { ToolCall, ToolExecutionResult, ToolInvoker } from "../tools/tool-contracts.ts";

/** 交互请求与普通工具的路由入口，等待用户不进入工具执行队列。 */
export class InteractiveToolInvoker implements ToolInvoker {
  /**
   * 绑定当前运行的工具与用户交互能力。
   * @param dependencies 运行身份、执行器、取消与事件通道。
   */
  constructor(private readonly dependencies: {
    runId: string; tools: ToolInvoker; signal: AbortSignal; emit: (event: AgentEvent) => void;
    userInput?: UserInputService;
  }) {}

  /** @param toolCall 模型请求。 @returns 工具结果或用户回答。 */
  async executeCall(toolCall: ToolCall): Promise<ToolExecutionResult> {
    const { runId, signal, emit, tools } = this.dependencies;
    const interactions = this.dependencies.userInput ?? userInputService;
    signal.throwIfAborted();
    if (interactions.hasPending(runId)) return failedResult("正在等待用户回答，请在收到回答后重新决策并调用工具");
    if (toolCall.toolName !== ASK_USER_TOOL_NAME) return tools.executeCall(toolCall);
    const parsed = askUserSchema.safeParse(toolCall.input.valid ? toolCall.input.value : null);
    if (!parsed.success) return failedResult(`提问参数无效：${parsed.error.issues[0]?.message}`);
    const record = await interactions.request({ runId, questions: parsed.data.questions, signal, emit });
    signal.throwIfAborted();
    return { success: true, content: JSON.stringify(record), parts: [record] };
  }

  /**
   * 提问批次不执行其他行动，等待回答后交回模型重新规划，避免确认前执行。
   * @param toolCalls 本轮全部工具请求。
   * @returns 与请求顺序对应的结果，包含被暂缓调用的明确说明。
   */
  executeCalls(toolCalls: ToolCall[]): Promise<PromiseSettledResult<ToolExecutionResult>[]> {
    const question = toolCalls.find((toolCall) => toolCall.toolName === ASK_USER_TOOL_NAME);
    if (!question) return Promise.allSettled(toolCalls.map((toolCall) => this.executeCall(toolCall)));
    return Promise.allSettled(toolCalls.map((toolCall) => toolCall === question
      ? this.executeCall(toolCall)
      : Promise.resolve(failedResult("本轮包含用户提问，此调用未执行。请依据用户回答重新决策。"))));
  }
}

/** 构造可交回模型的错误，不能把未执行的行动描述为成功。 */
function failedResult(message: string): ToolExecutionResult {
  return { success: false, content: JSON.stringify({ error: message }), parts: [] };
}
