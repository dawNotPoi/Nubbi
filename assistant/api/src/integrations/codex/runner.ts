import { waitForTurn } from "./turn-stream.ts";
import { CodexTurnIdentity } from "./turn-identity.ts";
import { toolSignature, resolveThread } from "./thread-lifecycle.ts";
import { cancelRunApprovals } from "../../tools/approvals.ts";

import { renderCodexBootstrap } from "./bootstrap.ts";
import type { AgentRunResult } from "../../agent/agent-loop.ts";
import type { CodexRunInput } from "./run-input.ts";

import type { MessagePart } from "../../types.ts";
import { readCodexAccount } from "./account.ts";
import { codexClient } from "./client.ts";
import { installDynamicToolHandler, registerDynamicToolContext, removeDynamicToolContext } from "./dynamic-tools.ts";
import { type TurnResponse } from "./protocol.ts";

/**
 * Codex Provider 执行入口：
 * 确保登录 → 续接/新建线程 → 注册动态工具上下文 → 启动 turn 并等待完成。
 * 流式文本通过事件推送，最终把纯文本拼成消息 parts 返回。
 * @param input Provider 执行上下文，包含对话、模型配置、工具网关与取消信号。
 * @returns 最终助手消息的内容块数组与 token 用量（Codex 暂不采集，固定为 null）。
 */
export const runCodex = async (input: CodexRunInput): Promise<AgentRunResult> => {
  input.signal.throwIfAborted();
  installDynamicToolHandler();
  const account = await readCodexAccount();
  if (account.account?.type !== "chatgpt") {
    throw new Error("请先在模型设置中登录 ChatGPT");
  }
  const conversation = await input.threadStore.load(input.conversationId);
  const resolved = await resolveThread(
    input.codexThreadId,
    input.modelConfig,
    input.tools,
    conversation?.codexToolSignature,
  );
  const threadId = resolved.threadId;
  input.signal.throwIfAborted();
  if (threadId !== input.codexThreadId) {
    await input.threadStore.save(input.conversationId, threadId, toolSignature(input.tools));
  }
  const parts: MessagePart[] = [];
  const turnIdentity = new CodexTurnIdentity();
  registerDynamicToolContext(threadId, input.gateway, parts, turnIdentity.ready);
  let turnId: string | null = null;
  const completion = waitForTurn(threadId, input.signal, input.emit, turnIdentity.ready);
  const interrupt = () => {
    turnIdentity.close();
    cancelRunApprovals(input.runId);
    if (turnId) {
      void codexClient.request("turn/interrupt", { threadId, turnId }).catch(() => undefined);
    }
  };
  input.signal.addEventListener("abort", interrupt, { once: true });
  try {
    try {
      const response = await codexClient.request<TurnResponse>("turn/start", {
        threadId,
        model: input.modelConfig.model,
        input: [
          {
            type: "text",
            text: resolved.isNew
              ? renderCodexBootstrap(input.context, input.currentMessageId, input.content)
              : input.content,
            text_elements: [],
          },
        ],
      });
      turnId = response.turn.id;
      turnIdentity.bind(turnId);
      if (input.signal.aborted) interrupt();
      const text = (await completion.promise).trim();
      if (text) parts.push({ type: "text", text });
      // Codex 订阅暂不提供 usage，固定返回 null。
      return { messageParts: parts, usage: null };
    } catch (error) {
      completion.cancel();
      await completion.promise.catch(() => undefined);
      if (!input.signal.aborted) cancelRunApprovals(input.runId);
      throw error;
    }
  } finally {
    turnIdentity.close();
    input.signal.removeEventListener("abort", interrupt);
    cancelRunApprovals(input.runId);
    removeDynamicToolContext(threadId);
  }
};
