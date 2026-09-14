import type { AgentEvent } from "@nubbi/assistant-shared/contracts";
import type { AgentContext } from "./context-builder.ts";
import type { RunUsage } from "./run-usage.ts";
import type { AgentRunResult } from "./agent-loop.ts";

/** 一次完整 Agent 任务的公共输入。 */
export type AgentRunInput = {
  runId: string;
  conversationId: string;
  currentMessageId: string;
  content: string;
  context: AgentContext;
  abortSignal: AbortSignal;
  publishEvent: (event: AgentEvent) => void;
  runUsage: RunUsage;
};
/** 完整任务执行器；自有循环和 Codex 都实现此契约。 */
export interface AgentExecutor {
  /**
   * 执行一个完整任务。
   * @param input 运行上下文。
   * @returns 最终内容与精确用量。
   */
  executeRun(input: AgentRunInput): Promise<AgentRunResult>;
}
