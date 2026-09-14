import { createAssistantClient } from "@nubbi/assistant-shared/client";

/** 浏览器端使用同源 /api，由 Vite 或生产代理转发。 */
const assistantClient = createAssistantClient({ assistantApiBaseUrl: "", fetchResponse: window.fetch.bind(window) });
/** 绑定浏览器传输的公共请求方法，配置访问密钥由调用方传入。 */
export const {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
  stopGeneration,
  resolveApproval,
  listConversationRuns,
  getRunEvents,
  getModelConfig,
  saveModelConfig,
  fetchProviderModels,
  getCodexAccount,
  startCodexLogin,
  logoutCodex,
  fetchCodexModels,
  listMcpServers,
  createMcpServer,
  updateMcpServer,
  deleteMcpServer,
  testMcpServer,
  listExtensions,
  setSkillEnabled,
  setMcpServerEnabled,
  streamMessage,
} = assistantClient;
