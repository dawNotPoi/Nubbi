import type { AgentEvent } from "../../types.ts";

import { codexClient } from "./client.ts";

import { isRecord, readString } from "./protocol.ts";

/**
 * 挂起等待当前 turn 完成：
 * 监听 Codex 的流式文本增量与 turn/completed 通知，支持中途取消。
 * @param threadId 正在运行的 Codex 线程 ID。
 * @param signal 取消信号，中止时拒绝 promise。
 * @param emit 事件回调，用于推送流式文本增量。
 * @param turnIdentity 当前轮次的启动响应；旧轮次通知必须忽略。
 * @returns promise 与手动取消函数；promise 解析为累积的流式文本。
 */
export const waitForTurn = (
  threadId: string,
  signal: AbortSignal,
  emit: (event: AgentEvent) => void,
  turnIdentity: Promise<string>,
): { promise: Promise<string>; cancel: () => void } => {
  signal.throwIfAborted();
  let cancel = () => undefined;
  const promise = new Promise<string>((resolve, reject) => {
    let active = true;
    let text = "";
    // 同一轮只展示一次“联网搜索”节点，避免重复刷屏。
    let searchNotified = false;
    let fileChangeNotified = false;
    let commandNotified = false;
    const unsubscribe = codexClient.onNotification((method, params) => {
      if (method === "assistant/connectionFailed") {
        handleNotification(method, params);
        return;
      }
      void turnIdentity
        .then((turnId) => {
          if (!active || signal.aborted) return;
          const eventTurnId = readString(params, "turnId") ?? (isRecord(params) ? readString(params.turn, "id") : null);
          if (method !== "assistant/connectionFailed" && eventTurnId !== turnId) return;
          handleNotification(method, params);
        })
        .catch(() => cancel());
    });
    const cleanup = (): void => {
      active = false;
      unsubscribe();
    };
    const handleNotification = (method: string, params: unknown): void => {
      if (method === "assistant/connectionFailed") {
        cleanup();
        signal.removeEventListener("abort", cancel);
        reject(new Error(readString(params, "message") ?? "Codex 连接中断"));
        return;
      }
      // 无法关联线程的通知不得广播到多个对话。
      const paramsThreadId = readString(params, "threadId");
      if (paramsThreadId !== threadId) return;
      // Codex 不同版本可能用不同通知名推送推理内容，这里尽量兼容常见字段。
      if (
        method === "item/reasoning/delta" ||
        method === "item/thinking/delta" ||
        method === "item/reasoning/textDelta" ||
        method === "item/reasoning/summaryTextDelta"
      ) {
        const delta =
          readString(params, "delta") ?? readString(params, "text") ?? readString(params, "reasoning") ?? "";
        if (delta) emit({ type: "reasoning-delta", text: delta });
        return;
      }
      // Codex 内置联网搜索不经过 ToolExecutor，这里尽量识别相关通知并展示为“联网搜索”节点。
      if (
        !searchNotified &&
        (method.toLowerCase().includes("websearch") ||
          method.toLowerCase().includes("search") ||
          method.toLowerCase().includes("citation") ||
          method.toLowerCase().includes("browser") ||
          JSON.stringify(params).toLowerCase().includes("web_search"))
      ) {
        searchNotified = true;
        const description =
          readString(params, "query") ?? readString(params, "url") ?? readString(params, "text") ?? "模型正在联网搜索";
        emit({ type: "skill-active", name: "联网搜索", description });
        return;
      }
      // Codex 文件修改过程：展示为“文件变更”节点。
      if (method === "item/fileChange/outputDelta" && !fileChangeNotified) {
        fileChangeNotified = true;
        const description =
          readString(params, "path") ??
          readString(params, "filePath") ??
          readString(params, "delta") ??
          "Codex 正在修改文件";
        emit({ type: "skill-active", name: "文件变更", description });
        return;
      }
      // Codex 命令执行过程：展示为“命令执行”节点。
      if (method === "command/exec/outputDelta" && !commandNotified) {
        commandNotified = true;
        const description =
          readString(params, "command") ??
          readString(params, "output") ??
          readString(params, "delta") ??
          "Codex 正在执行命令";
        emit({ type: "skill-active", name: "命令执行", description });
        return;
      }
      if (method === "item/agentMessage/delta") {
        const reasoning =
          readString(params, "reasoning") ?? readString(params, "reasoning_content") ?? readString(params, "thought");
        if (reasoning) emit({ type: "reasoning-delta", text: reasoning });
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
      } else if (status === "completed") {
        resolve(text);
      } else {
        reject(new Error(status === "interrupted" ? "生成已停止" : "Codex 未正常完成本次任务"));
      }
    };
    cancel = () => {
      cleanup();
      signal.removeEventListener("abort", cancel);
      reject(new Error("生成已停止"));
    };
    // 客户端断连时也取消等待。
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
  });
  // turn/start 尚未返回时也可能收到取消，提前观察拒绝以避免未处理异常。
  void promise.catch(() => undefined);
  return { promise, cancel };
};
