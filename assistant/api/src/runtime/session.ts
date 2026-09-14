import { randomUUID } from "node:crypto";
import { cancelThreadApprovals } from "../approvals.js";
import { discoverMcpTools } from "../mcp.js";
import { readModelConfig } from "../model-config.js";
import { listSkills } from "../skills.js";
import { appendMessage, getConversation } from "../store.js";
import type { Message, RuntimeEvent } from "../types.js";
import { codexExecutor } from "./codex-executor.js";
import { buildAgentContext } from "./context-builder.js";
import { createRuntimeEventEmitter } from "./event-emitter.js";
import { openAiExecutor } from "./openai-executor.js";
import { ToolGateway } from "./tool-gateway.js";

type ActiveRun = { runId: string; controller: AbortController };

export type RuntimeOutcome = { message: Message; error?: string };

export type PreparedRun = {
  runId: string;
  execute: () => Promise<RuntimeOutcome>;
  stop: () => void;
};

export class RuntimeConflictError extends Error {}

export class RuntimeSession {
  private readonly active = new Map<string, ActiveRun>();

  public async prepareTurn(input: {
    conversationId: string;
    content: string;
    onEvent: (event: RuntimeEvent) => void;
    agentId?: string;
    parentRunId?: string;
  }): Promise<PreparedRun> {
    if (this.active.has(input.conversationId)) {
      throw new RuntimeConflictError("当前对话已有任务正在生成");
    }
    const runId = randomUUID();
    const controller = new AbortController();
    this.active.set(input.conversationId, { runId, controller });
    try {
      const [existingConversation, modelConfig, skills, tools] = await Promise.all([
        getConversation(input.conversationId),
        readModelConfig(),
        listSkills(),
        discoverMcpTools(),
      ]);
      if (!existingConversation) throw new Error("对话不存在");
      const currentMessage = await appendMessage(input.conversationId, "user", [
        { type: "text", text: input.content },
      ]);
      const conversation = await getConversation(input.conversationId);
      if (!conversation) throw new Error("对话不存在");
      const context = buildAgentContext(conversation);
      const emitter = createRuntimeEventEmitter({
        runId,
        conversationId: input.conversationId,
        agentId: input.agentId ?? "assistant",
        parentRunId: input.parentRunId,
        onEvent: input.onEvent,
      });
      let started = false;
      const execute = async (): Promise<RuntimeOutcome> => {
        if (started) throw new Error("Run 已经启动");
        started = true;
        emitter.emit({ type: "run-started", provider: modelConfig.provider });
        const emit = (event: Parameters<typeof emitter.emit>[0]) => emitter.emit(event);
        const gateway = new ToolGateway({ runId, tools, emit, signal: controller.signal });
        const executor = modelConfig.provider === "codex-subscription"
          ? codexExecutor
          : openAiExecutor;
        try {
          const parts = await executor.execute({
            runId,
            conversationId: input.conversationId,
            currentMessageId: currentMessage.id,
            content: input.content,
            codexThreadId: conversation.codexThreadId,
            context,
            modelConfig,
            skills,
            tools,
            gateway,
            signal: controller.signal,
            emit,
          });
          const message = await appendMessage(input.conversationId, "assistant", parts);
          emitter.emit({ type: "assistant-message", messageId: message.id });
          emitter.emit({ type: "run-completed", messageId: message.id });
          return { message };
        } catch (error) {
          const messageText = controller.signal.aborted
            ? "生成已停止"
            : error instanceof Error ? error.message : "助手运行失败";
          const message = await appendMessage(input.conversationId, "assistant", [
            { type: "error", message: messageText },
          ]);
          emitter.emit({
            type: "run-failed",
            messageId: message.id,
            message: messageText,
            cancelled: controller.signal.aborted,
          });
          return { message, error: messageText };
        } finally {
          cancelThreadApprovals(runId);
          await emitter.flush();
          const current = this.active.get(input.conversationId);
          if (current?.runId === runId) this.active.delete(input.conversationId);
        }
      };
      return { runId, execute, stop: () => controller.abort() };
    } catch (error) {
      this.active.delete(input.conversationId);
      throw error;
    }
  }

  public stopConversation(conversationId: string): boolean {
    const active = this.active.get(conversationId);
    if (!active) return false;
    active.controller.abort();
    cancelThreadApprovals(active.runId);
    return true;
  }

  public isConversationActive(conversationId: string): boolean {
    return this.active.has(conversationId);
  }

}

export const runtimeSession = new RuntimeSession();
