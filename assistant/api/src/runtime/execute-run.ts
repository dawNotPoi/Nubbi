import type { Message, RuntimeEvent, TokenUsage } from "@nubbi/assistant-shared/contracts";
import type { AgentContext } from "../agent/context-builder.ts";
import type { StoredModelConfig } from "../features/settings/model-config.schema.ts";
import type { McpTool } from "../integrations/mcp/mcp.ts";
import type { Skill } from "../integrations/skills/skill-store.ts";
import {
  appendMessage,
  accumulateTokenUsage,
  getConversation,
  setCodexThreadId,
} from "../features/conversations/conversation.repository.ts";
import { RunUsage } from "../agent/run-usage.ts";
import { ToolExecutor } from "../tools/tool-executor.ts";
import { createAgentExecutor } from "./executor-factory.ts";
import { createRunTools } from "./run-tools.ts";
import { RunMessageCollector } from "./message-collector.ts";
import { createRuntimeEventEmitter } from "./event-emitter.ts";
import { cancelRunApprovals } from "../tools/approvals.ts";

/** 一次已准备好的运行，连接配置只在组装阶段使用。 */
export type PreparedRunInput = {
  runId: string;
  conversationId: string;
  currentMessageId: string;
  content: string;
  modelConfig: StoredModelConfig;
  mcpTools: McpTool[];
  skills: Skill[];
  context: AgentContext;
  abortSignal: AbortSignal;
  onEvent: (event: RuntimeEvent) => void;
  agentId?: string;
  parentRunId?: string;
};
/** HTTP 层得到的已持久化运行结果。 */
export type RuntimeOutcome = { message: Message; error?: string };

/**
 * 组装执行器并保存结果；所有退出路径均清理审批和事件写入。
 * @param input 已准备的任务及其依赖。
 * @returns 已持久化的助手消息与可选错误。
 */
export async function executePreparedRun(input: PreparedRunInput): Promise<RuntimeOutcome> {
  const emitter = createRuntimeEventEmitter({ ...input, agentId: input.agentId ?? "assistant" });
  const collector = new RunMessageCollector();
  const runUsage = new RunUsage((usage) => emitter.emit({ type: "token-usage", ...usage }));
  const publishEvent = (event: Parameters<RunMessageCollector["record"]>[0]): void => {
    collector.record(event);
    emitter.emit(event);
  };
  emitter.emit({ type: "run-started", provider: input.modelConfig.provider });
  emitter.emit({
    type: "context-status",
    usedTokens: input.context.usedTokens,
    maxTokens: input.context.maxTokens,
    truncated: input.context.truncated,
  });
  let messageParts: Message["parts"];
  let failureMessage: string | undefined;
  try {
    input.abortSignal.throwIfAborted();
    const registeredTools = createRunTools({
      mcpTools: input.mcpTools,
      skills: input.skills,
      publishEvent,
      readUsage: async () => mergeUsage((await getConversation(input.conversationId))?.tokenUsage, runUsage.snapshot()),
    });
    const toolExecutor = new ToolExecutor({
      runId: input.runId,
      registeredTools,
      publishEvent,
      abortSignal: input.abortSignal,
    });
    const executor = createAgentExecutor({
      modelConfig: input.modelConfig,
      mcpTools: input.mcpTools,
      skills: input.skills,
      registeredTools,
      toolExecutor,
      threadStore: { load: getConversation, save: setCodexThreadId },
    });
    const result = await executor.executeRun({ ...input, publishEvent, runUsage });
    input.abortSignal.throwIfAborted();
    // 与实际事件顺序保持一致，Codex 的推理和 Skill 事件也进入最终历史。
    messageParts = collector.snapshot(result.messageParts);
    if (!messageParts.length) messageParts = result.messageParts;
  } catch (error) {
    failureMessage = input.abortSignal.aborted ? "生成已停止" : error instanceof Error ? error.message : "助手运行失败";
    cancelRunApprovals(input.runId);
    messageParts = [...collector.snapshot(), { type: "error", message: failureMessage }];
  }
  try {
    const message = await appendMessage(input.conversationId, "assistant", messageParts);
    const usage = runUsage.snapshot();
    if (usage) {
      await accumulateTokenUsage(input.conversationId, usage);
      emitter.emit({ type: "token-usage", ...usage });
    }
    emitter.emit({ type: "assistant-message", messageId: message.id });
    if (failureMessage)
      emitter.emit({
        type: "run-failed",
        messageId: message.id,
        message: failureMessage,
        cancelled: input.abortSignal.aborted,
      });
    else emitter.emit({ type: "run-completed", messageId: message.id });
    return { message, error: failureMessage };
  } finally {
    cancelRunApprovals(input.runId);
    await emitter.flush();
  }
}

/** 合并历史与本轮统计，缺失统计保留为未知。 */
function mergeUsage(saved: TokenUsage | undefined, current: TokenUsage | null): TokenUsage | null {
  const accumulator = new RunUsage();
  accumulator.add(saved ?? null);
  accumulator.add(current);
  return accumulator.snapshot();
}
