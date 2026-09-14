import { randomUUID } from "node:crypto";
import type { RuntimeEvent } from "@nubbi/assistant-shared/contracts";
import { cancelRunApprovals } from "../tools/approvals.ts";
import { discoverMcpTools } from "../integrations/mcp/mcp.ts";
import { readModelConfig } from "../features/settings/model-config.repository.ts";
import { DEFAULT_CONTEXT_WINDOW } from "../features/settings/model-config.schema.ts";
import { listSkills } from "../integrations/skills/skill-store.ts";
import { appendMessage, getConversation } from "../features/conversations/conversation.repository.ts";
import { buildAgentContext } from "../agent/context-builder.ts";
import { executePreparedRun, type RuntimeOutcome } from "./execute-run.ts";

/** 创建运行所需的业务参数，不包含模型协议。 */
export type PrepareRunInput = {
  conversationId: string;
  content: string;
  onEvent: (event: RuntimeEvent) => void;
  connectionSignal?: AbortSignal;
  agentId?: string;
  parentRunId?: string;
};
/** 同一对话同时只允许一个任务，冲突由 HTTP 层转换为 409。 */
export class RuntimeConflictError extends Error {}
/** 已准备的任务句柄，只能执行一次。 */
export type PreparedRun = { runId: string; execute: () => Promise<RuntimeOutcome>; stop: () => void };
/** 正在准备或执行的任务占位。 */
type ActiveRun = { runId: string; controller: AbortController; detachConnection: () => void };

/** 协调多个对话的任务生命周期，不承担模型或工具的具体执行逻辑。 */
export class RunCoordinator {
  private readonly activeRuns = new Map<string, ActiveRun>();

  /**
   * 占用对话、准备依赖并保存用户输入，返回延迟执行句柄。
   * @param input 对话输入与事件订阅者。
   * @returns 只能执行一次的运行句柄。
   */
  public async prepareRun(input: PrepareRunInput): Promise<PreparedRun> {
    if (this.activeRuns.has(input.conversationId)) throw new RuntimeConflictError("当前对话已有任务正在生成");
    const runId = randomUUID();
    const controller = new AbortController();
    const cancelConnection = (): void => {
      controller.abort();
      cancelRunApprovals(runId);
    };
    input.connectionSignal?.addEventListener("abort", cancelConnection, { once: true });
    const detachConnection = (): void => input.connectionSignal?.removeEventListener("abort", cancelConnection);
    this.activeRuns.set(input.conversationId, { runId, controller, detachConnection });
    try {
      if (input.connectionSignal?.aborted) cancelConnection();
      controller.signal.throwIfAborted();
      const [conversation, modelConfig, skills, mcpTools] = await Promise.all([
        getConversation(input.conversationId),
        readModelConfig(),
        listSkills(),
        discoverMcpTools(controller.signal),
      ]);
      controller.signal.throwIfAborted();
      if (!conversation) throw new Error("对话不存在");
      const userMessage = await appendMessage(input.conversationId, "user", [{ type: "text", text: input.content }]);
      const updatedConversation = await getConversation(input.conversationId);
      if (!updatedConversation) throw new Error("对话不存在");
      const context = buildAgentContext(
        updatedConversation,
        Math.floor((modelConfig.contextWindow ?? DEFAULT_CONTEXT_WINDOW) * 0.8),
      );
      let hasStarted = false;
      return {
        runId,
        execute: async (): Promise<RuntimeOutcome> => {
          if (hasStarted) throw new Error("Run 已经启动");
          hasStarted = true;
          try {
            return await executePreparedRun({
              ...input,
              runId,
              currentMessageId: userMessage.id,
              modelConfig,
              skills,
              mcpTools,
              context,
              abortSignal: controller.signal,
            });
          } finally {
            this.releaseRun(input.conversationId, runId);
          }
        },
        stop: (): void => {
          controller.abort();
          cancelRunApprovals(runId);
        },
      };
    } catch (error) {
      this.releaseRun(input.conversationId, runId);
      throw error;
    }
  }

  /**
   * 停止指定对话的运行，并拒绝其挂起审批。
   * @param conversationId 对话 ID。
   * @returns 是否找到可停止的任务。
   */
  public stopConversation(conversationId: string): boolean {
    const activeRun = this.activeRuns.get(conversationId);
    if (!activeRun) return false;
    activeRun.controller.abort();
    cancelRunApprovals(activeRun.runId);
    return true;
  }

  /**
   * 判断对话是否被准备中或执行中的任务占用。
   * @param conversationId 对话 ID。
   * @returns 是否存在活跃任务。
   */
  public isConversationActive(conversationId: string): boolean {
    return this.activeRuns.has(conversationId);
  }

  /** 按运行身份释放占位，旧任务不能清除后续任务。 */
  private releaseRun(conversationId: string, runId: string): void {
    const activeRun = this.activeRuns.get(conversationId);
    if (activeRun?.runId !== runId) return;
    activeRun.detachConnection();
    this.activeRuns.delete(conversationId);
  }
}

/** 应用唯一运行协调器，同一进程内共享对话占位。 */
export const runCoordinator = new RunCoordinator();
