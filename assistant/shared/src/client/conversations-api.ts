import type { Conversation, ConversationSummary, RunSummary, RuntimeEvent } from "../contracts/index.ts";
import type { HttpTransport } from "./http-transport.ts";

/** conversations 业务接口，与平台无关。 */
export type ConversationsApi = {
  listConversations: () => Promise<ConversationSummary[]>;
  getConversation: (id: string) => Promise<Conversation>;
  createConversation: () => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  stopGeneration: (conversationId: string) => Promise<void>;
  resolveApproval: (id: string, approved: boolean) => Promise<void>;
  listConversationRuns: (conversationId: string) => Promise<RunSummary[]>;
  getRunEvents: (runId: string) => Promise<RuntimeEvent[]>;
};

/**
 * 绑定 conversations 接口的 HTTP 传输。
 * @param transport 请求能力。
 * @returns 业务接口。
 */
export function createConversationsApi(transport: HttpTransport): ConversationsApi {
  /**
   * 列出全部对话摘要。
   * @returns 对话摘要列表。
   */
  const listConversations = (): Promise<ConversationSummary[]> => transport.request("/api/conversations");

  /**
   * 获取指定对话的完整内容。
   * @param id 对话的唯一 ID。
   * @returns 完整对话对象。
   */
  const getConversation = (id: string): Promise<Conversation> => transport.request(`/api/conversations/${id}`);

  /**
   * 创建一个新对话。
   * @returns 新建的对话对象。
   */
  const createConversation = (): Promise<Conversation> => transport.request("/api/conversations", { method: "POST" });

  /**
   * 删除指定对话。
   * @param id 对话的唯一 ID。
   * @returns 无返回值。
   */
  const deleteConversation = (id: string): Promise<void> =>
    transport.request(`/api/conversations/${id}`, { method: "DELETE" });

  /**
   * 停止指定对话的生成任务。
   * @param conversationId 对话的唯一 ID。
   * @returns 无返回值。
   */
  const stopGeneration = (conversationId: string): Promise<void> =>
    transport.request(`/api/conversations/${conversationId}/generations/stop`, { method: "POST" });

  /**
   * 提交工具审批决定。
   * @param id 审批 ID。
   * @param approved 是否允许。
   * @returns 无返回值。
   */
  const resolveApproval = (id: string, approved: boolean): Promise<void> =>
    transport.request(`/api/approvals/${id}`, {
      method: "POST",
      body: JSON.stringify({ approved }),
    });

  /**
   * 查询对话的全部 Run 摘要。
   * @param conversationId 对话的唯一 ID。
   * @returns Run 摘要列表。
   */
  const listConversationRuns = (conversationId: string): Promise<RunSummary[]> =>
    transport.request(`/api/conversations/${conversationId}/runs`);

  /**
   * 查询指定 Run 的完整事件序列。
   * @param runId Run 的唯一 ID。
   * @returns 该 Run 的运行时事件列表。
   */
  const getRunEvents = (runId: string): Promise<RuntimeEvent[]> => transport.request(`/api/runs/${runId}/events`);
  return {
    listConversations,
    getConversation,
    createConversation,
    deleteConversation,
    stopGeneration,
    resolveApproval,
    listConversationRuns,
    getRunEvents,
  };
}
