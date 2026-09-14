import { randomUUID } from "node:crypto";
import { cancelThreadApprovals } from "./approvals.js";
import { discoverMcpTools } from "../mcp/mcp.js";
import { readModelConfig, DEFAULT_CONTEXT_WINDOW } from "../model/model-config.js";
import { listSkills } from "../orchestration/skills.js";
import { appendMessage, accumulateTokenUsage, getConversation } from "../models/store.js";
import type { Message, RuntimeEvent } from "../types.js";
import { codexExecutor } from "./codex-executor.js";
import { buildAgentContext } from "./context-builder.js";
import { createRuntimeEventEmitter } from "./event-emitter.js";
import { openAiExecutor } from "./openai-executor.js";
import { ToolGateway } from "./tool-gateway.js";

/** 正在执行中的 Run：runId 用于防止过期句柄误清理他人任务，controller 用于中止生成。 */
type ActiveRun = { runId: string; controller: AbortController };

/** 一次 Run 的执行结果：message 为最终落库的助手消息，error 存在表示执行失败。 */
export type RuntimeOutcome = { message: Message; error?: string };

/**
 * prepareTurn 返回的句柄：
 * - execute 启动真正执行，同一句柄只能调用一次；
 * - stop 向 AbortController 发信号，用于客户端断连或用户主动停止。
 */
export type PreparedRun = {
  runId: string;
  execute: () => Promise<RuntimeOutcome>;
  stop: () => void;
};

/** 同一对话已有任务在跑时抛出，由 Controller 层映射为 409 冲突。 */
export class RuntimeConflictError extends Error {}

export class RuntimeSession {
  /** 每个对话同时只允许一个活跃 Run，key 为 conversationId。 */
  private readonly active = new Map<string, ActiveRun>();

  /**
   * 准备一次消息生成：加载依赖、落库用户消息并返回执行句柄。
   * 同一对话已有活跃 Run 时会抛 RuntimeConflictError。
   * @param input 生成参数：对话 ID、用户输入、事件回调与可选的 Agent/父 Run 关联。
   * @returns 执行句柄，execute 启动生成，stop 中止任务。
   */
  public async prepareTurn(input: {
    conversationId: string;
    content: string;
    onEvent: (event: RuntimeEvent) => void;
    agentId?: string;
    parentRunId?: string;
  }): Promise<PreparedRun> {
    // 冲突检查：防止同一对话并发触发多个生成任务，保证消息顺序与资源占用可控。
    if (this.active.has(input.conversationId)) {
      throw new RuntimeConflictError("当前对话已有任务正在生成");
    }
    const runId = randomUUID();
    // AbortController 贯穿整个 Run，stop() 与外层断开连接回调都通过它中止模型调用。
    const controller = new AbortController();
    this.active.set(input.conversationId, { runId, controller });
    try {
      // 准备阶段并发加载所有依赖，缩短用户等待首帧的时间。
      const [existingConversation, modelConfig, skills, tools] =
        await Promise.all([
          getConversation(input.conversationId),
          readModelConfig(),
          listSkills(),
          discoverMcpTools(),
        ]);
      if (!existingConversation) throw new Error("对话不存在");
      // 先把用户消息落库，后续助手消息才能与之正确串联。
      const currentMessage = await appendMessage(input.conversationId, "user", [
        { type: "text", text: input.content },
      ]);
      //获取落库后的对话,首条消息部分字符会作为对话标题
      const conversation = await getConversation(input.conversationId);
      if (!conversation) throw new Error("对话不存在");
      // 上下文压缩预算 = 上下文窗口的 80%，预留余量给模型输出。
      const contextWindow = modelConfig.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
      const context = buildAgentContext(conversation, Math.floor(contextWindow * 0.8));
      // 事件发射器统一为每条事件补全元信息，并负责异步落库 Run 日志。
      const emitter = createRuntimeEventEmitter({
        runId,
        conversationId: input.conversationId,
        agentId: input.agentId ?? "assistant",
        parentRunId: input.parentRunId,
        onEvent: input.onEvent,
      });
      // started 防止同一句柄被重复执行（例如 Controller 层意外重入）。
      let started = false;
      const execute = async (): Promise<RuntimeOutcome> => {
        if (started) throw new Error("Run 已经启动");
        started = true;
        emitter.emit({ type: "run-started", provider: modelConfig.provider });
        // 推送上下文占用状态，供前端展示模型消耗量与容量比例。
        emitter.emit({
          type: "context-status",
          usedTokens: context.usedTokens,
          maxTokens: context.maxTokens,
          truncated: context.truncated,
        });
        const emit = (event: Parameters<typeof emitter.emit>[0]) =>
          emitter.emit(event);
        // ToolGateway 拦截模型的工具调用：执行本地工具并校验审批，是安全边界所在。
        const gateway = new ToolGateway({
          runId,
          tools,
          emit,
          signal: controller.signal,
        });
        // 按模型供应商选择执行器：Codex 走订阅会话，其余走 OpenAI 兼容接口。
        const executor =
          modelConfig.provider === "codex-subscription"
            ? codexExecutor
            : openAiExecutor;
        try {
          const result = await executor.execute({
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
          const message = await appendMessage(
            input.conversationId,
            "assistant",
            result.parts,
          );
          // 推送并落库本轮累计的 token 用量，供前端 /status 展示。
          if (result.usage) {
            emitter.emit({
              type: "token-usage",
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            });
            await accumulateTokenUsage(input.conversationId, result.usage);
          }
          emitter.emit({ type: "assistant-message", messageId: message.id });
          emitter.emit({ type: "run-completed", messageId: message.id });
          return { message };
        } catch (error) {
          // 失败也落一条 error 类型消息，保证会话历史完整可追溯。
          const messageText = controller.signal.aborted
            ? "生成已停止"
            : error instanceof Error
              ? error.message
              : "助手运行失败";
          const message = await appendMessage(
            input.conversationId,
            "assistant",
            [{ type: "error", message: messageText }],
          );
          emitter.emit({
            type: "run-failed",
            messageId: message.id,
            message: messageText,
            cancelled: controller.signal.aborted,
          });
          return { message, error: messageText };
        } finally {
          // 无论成败都清理本 Run 挂起的审批，避免工具调用卡死在等待状态。
          cancelThreadApprovals(runId);
          // 等待所有异步事件日志写完后，才允许释放对话上的活跃标记。
          await emitter.flush();
          // 用 runId 校验，防止新的 Run 已被启动时误删它的标记。
          const current = this.active.get(input.conversationId);
          if (current?.runId === runId)
            this.active.delete(input.conversationId);
        }
      };
      // 准备阶段只返回句柄不执行，具体启动时机交由调用方（Controller）决定。
      return { runId, execute, stop: () => controller.abort() };
    } catch (error) {
      // 准备阶段异常时释放占位标记，避免“幽灵”任务阻塞后续请求。
      this.active.delete(input.conversationId);
      throw error;
    }
  }

  /**
   * 主动停止指定对话的生成任务，返回是否确实存在可停止的任务。
   * @param conversationId 目标对话的唯一 ID。
   * @returns 存在活跃任务并已发送停止信号返回 true，否则返回 false。
   */
  public stopConversation(conversationId: string): boolean {
    const active = this.active.get(conversationId);
    if (!active) return false;
    active.controller.abort();
    // 停止生成时同样取消该 Run 挂起的审批，避免模型已停但工具审批还悬着。
    cancelThreadApprovals(active.runId);
    return true;
  }

  /**
   * 供 Controller 在删除对话等场景判断是否存在进行中的任务。
   * @param conversationId 目标对话的唯一 ID。
   * @returns 该对话当前是否有正在执行的 Run。
   */
  public isConversationActive(conversationId: string): boolean {
    return this.active.has(conversationId);
  }
}

export const runtimeSession = new RuntimeSession();
