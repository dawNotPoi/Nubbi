import type { ChatApi } from "./chat-api.ts";
import type { ChatStateStore } from "./chat-state.ts";

/**
 * 兼容旧审批协议，新的 Agent 交互使用用户问答能力。
 * @param store 当前聊天状态。
 * @param api 审批接口。
 * @param approved 用户选择。
 * @param approvalId 旧请求身份。
 * @returns 请求完成的 Promise。
 */
export async function submitLegacyApproval(store: ChatStateStore, api: ChatApi, approved: boolean, approvalId?: string): Promise<void> {
  if (!approvalId || approvalId !== store.getSnapshot().approval?.approvalId) return;
  const conversationId = store.getSnapshot().selectedConversation?.id;
  const runId = store.getSnapshot().traceRunId;
  store.update({ approval: null });
  try { await api.resolveApproval(approvalId, approved); }
  catch (error) {
    if (store.getSnapshot().selectedConversation?.id === conversationId && store.getSnapshot().traceRunId === runId)
      store.update({ error: error instanceof Error ? error.message : "请求失败" });
  }
}
