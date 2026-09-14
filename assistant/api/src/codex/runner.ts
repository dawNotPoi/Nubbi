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

const startThread = async (
  modelConfig: StoredModelConfig,
  tools: McpTool[],
): Promise<string> => {
  const response = await codexClient.request<ThreadResponse>("thread/start", {
    model: modelConfig.model || null,
    cwd: codexWorkspace,
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
    signal.addEventListener("abort", cancel, { once: true });
  });
  return { promise, cancel };
};

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
