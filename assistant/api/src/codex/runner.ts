import { cancelThreadApprovals } from "../approvals.js";
import type { McpTool } from "../mcp.js";
import type { StoredModelConfig } from "../model-config.js";
import { renderCodexBootstrap } from "../runtime/context-builder.js";
import type { ProviderExecutorInput } from "../runtime/provider-executor.js";
import { setCodexThreadId } from "../store.js";
import type { AgentEvent, MessagePart } from "../types.js";
import { readCodexAccount } from "./account.js";
import { codexClient, codexWorkspace } from "./client.js";
import {
  installDynamicToolHandler,
  registerDynamicToolContext,
  removeDynamicToolContext,
  toDynamicTools,
} from "./dynamic-tools.js";
import {
  isRecord,
  readString,
  type ThreadResponse,
  type TurnResponse,
} from "./protocol.js";

/**
 * 创建新的 Codex 线程，只读沙箱、审批交给用户，工具只提供动态工具。
 * @param modelConfig 模型配置，用于指定模型与系统提示。
 * @param tools MCP 工具列表，转换为动态工具随线程创建传入。
 * @returns 新建线程的 ID。
 */
const startThread = async (
  modelConfig: StoredModelConfig,
  tools: McpTool[],
): Promise<string> => {
  const response = await codexClient.request<ThreadResponse>("thread/start", {
    model: modelConfig.model || null,
    cwd: codexWorkspace,
    // 关闭 Codex 自身的审批与写操作，能力边界统一由 ToolGateway 控制。
    approvalPolicy: "never",
    approvalsReviewer: "user",
    sandbox: "read-only",
    developerInstructions: [
      modelConfig.systemPrompt,
      "你是 Nubbi Assistant。按需使用已安装 Skill；调用外部能力时只使用提供的动态工具，不使用命令执行、文件变更或网络搜索工具。",
    ].filter(Boolean).join("\n\n"),
    dynamicTools: toDynamicTools(tools),
  });
  return response.thread.id;
};

/**
 * 续接已有线程；续接失败（如本地 Codex 数据被清理）时回退为新线程。
 * 返回是否新建，供调用方决定是否注入历史上下文。
 * @param currentId 已保存的 Codex 线程 ID，可空。
 * @param modelConfig 模型配置，用于创建新线程时使用。
 * @param tools MCP 工具列表，仅在新建线程时使用。
 * @returns 解析后的线程 ID 与是否新建的标记。
 */
const resolveThread = async (
  currentId: string | undefined,
  modelConfig: StoredModelConfig,
  tools: McpTool[],
): Promise<{ threadId: string; isNew: boolean }> => {
  if (currentId) {
    try {
      await codexClient.request<ThreadResponse>("thread/resume", {
        threadId: currentId,
        model: modelConfig.model || null,
        cwd: codexWorkspace,
        approvalPolicy: "never",
        approvalsReviewer: "user",
        sandbox: "read-only",
      });
      return { threadId: currentId, isNew: false };
    } catch {
      // 本地 Codex 数据被清理后，通过新线程恢复可用性。
    }
  }
  return { threadId: await startThread(modelConfig, tools), isNew: true };
};

/**
 * 挂起等待当前 turn 完成：
 * 监听 Codex 的流式文本增量与 turn/completed 通知，支持中途取消。
 * @param threadId 正在运行的 Codex 线程 ID。
 * @param signal 取消信号，中止时拒绝 promise。
 * @param emit 事件回调，用于推送流式文本增量。
 * @returns promise 与手动取消函数；promise 解析为累积的流式文本。
 */
const waitForTurn = (
  threadId: string,
  signal: AbortSignal,
  emit: (event: AgentEvent) => void,
): { promise: Promise<string>; cancel: () => void } => {
  let cancel = () => undefined;
  const promise = new Promise<string>((resolve, reject) => {
    let text = "";
    const cleanup = codexClient.onNotification((method, params) => {
      if (readString(params, "threadId") !== threadId) return;
      if (method === "item/agentMessage/delta") {
        const delta = readString(params, "delta") ?? "";
        text += delta;
        if (delta) emit({ type: "text-delta", text: delta });
        return;
      }
      if (method !== "turn/completed" || !isRecord(params) || !isRecord(params.turn)) return;
      cleanup();
      signal.removeEventListener("abort", cancel);
      const status = readString(params.turn, "status");
      if (status === "failed") {
        const error = isRecord(params.turn.error) ? readString(params.turn.error, "message") : null;
        reject(new Error(error ?? "Codex 生成失败"));
      } else {
        resolve(text);
      }
    });
    cancel = () => {
      cleanup();
      signal.removeEventListener("abort", cancel);
      reject(new Error("生成已停止"));
    };
    // 客户端断连时也取消等待。
    signal.addEventListener("abort", cancel, { once: true });
  });
  return { promise, cancel };
};

/**
 * Codex Provider 执行入口：
 * 确保登录 → 续接/新建线程 → 注册动态工具上下文 → 启动 turn 并等待完成。
 * 流式文本通过事件推送，最终把纯文本拼成消息 parts 返回。
 * @param input Provider 执行上下文，包含对话、模型配置、工具网关与取消信号。
 * @returns 最终助手消息的内容块数组（文本 / 工具执行 / 错误等）。
 */
export const runCodex = async (input: ProviderExecutorInput): Promise<MessagePart[]> => {
  installDynamicToolHandler();
  const account = await readCodexAccount();
  if (account.account?.type !== "chatgpt") {
    throw new Error("请先在模型设置中登录 ChatGPT");
  }
  const resolved = await resolveThread(input.codexThreadId, input.modelConfig, input.tools);
  const threadId = resolved.threadId;
  if (threadId !== input.codexThreadId) {
    await setCodexThreadId(input.conversationId, threadId);
  }
  const parts: MessagePart[] = [];
  registerDynamicToolContext(threadId, input.gateway, parts);
  let turnId: string | null = null;
  const completion = waitForTurn(threadId, input.signal, input.emit);
  const interrupt = () => {
    cancelThreadApprovals(input.runId);
    if (turnId) {
      void codexClient.request("turn/interrupt", { threadId, turnId }).catch(() => undefined);
    }
  };
  input.signal.addEventListener("abort", interrupt, { once: true });
  try {
    try {
      const response = await codexClient.request<TurnResponse>("turn/start", {
        threadId,
        input: [{
          type: "text",
          text: resolved.isNew
            ? renderCodexBootstrap(input.context, input.currentMessageId, input.content)
            : input.content,
          text_elements: [],
        }],
      });
      turnId = response.turn.id;
      if (input.signal.aborted) interrupt();
      const text = (await completion.promise).trim();
      if (text) parts.push({ type: "text", text });
      return parts;
    } catch (error) {
      completion.cancel();
      await completion.promise.catch(() => undefined);
      if (!input.signal.aborted) cancelThreadApprovals(input.runId);
      throw error;
    }
  } finally {
    input.signal.removeEventListener("abort", interrupt);
    cancelThreadApprovals(input.runId);
    removeDynamicToolContext(threadId);
  }
};
