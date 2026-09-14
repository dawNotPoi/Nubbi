import type { McpConnectionTest, McpServerConfig } from "../contracts/index.ts";
import type { HttpTransport } from "./http-transport.ts";

/** mcp 业务接口，与平台无关。 */
export type McpApi = {
  listMcpServers: (configAccessToken: string) => Promise<McpServerConfig[]>;
  createMcpServer: (configAccessToken: string, server: McpServerConfig) => Promise<McpServerConfig>;
  updateMcpServer: (configAccessToken: string, server: McpServerConfig) => Promise<McpServerConfig>;
  deleteMcpServer: (configAccessToken: string, id: string) => Promise<void>;
  testMcpServer: (configAccessToken: string, server: McpServerConfig) => Promise<McpConnectionTest>;
};

/**
 * 绑定 mcp 接口的 HTTP 传输。
 * @param transport 请求能力。
 * @returns 业务接口。
 */
export function createMcpApi(transport: HttpTransport): McpApi {
  const mcpRequest = <T>(configAccessToken: string, endpoint: string, init?: RequestInit): Promise<T> =>
    transport.configRequest<T>(configAccessToken, `/api/mcp${endpoint}`, init);

  /**
   * 列出全部 MCP 服务配置。
   * @param configAccessToken 管理密钥。
   * @returns 服务配置列表。
   */
  const listMcpServers = (configAccessToken: string): Promise<McpServerConfig[]> =>
    mcpRequest(configAccessToken, "/servers");

  /**
   * 新建 MCP 服务。
   * @param configAccessToken 管理密钥。
   * @param server 服务配置。
   * @returns 已保存的服务配置。
   */
  const createMcpServer = (configAccessToken: string, server: McpServerConfig): Promise<McpServerConfig> =>
    mcpRequest(configAccessToken, "/servers", {
      method: "POST",
      body: JSON.stringify(server),
    });

  /**
   * 更新 MCP 服务。
   * @param configAccessToken 管理密钥。
   * @param server 新的服务配置（含原 ID）。
   * @returns 已保存的服务配置。
   */
  const updateMcpServer = (configAccessToken: string, server: McpServerConfig): Promise<McpServerConfig> =>
    mcpRequest(configAccessToken, `/servers/${server.id}`, {
      method: "PUT",
      body: JSON.stringify(server),
    });

  /**
   * 删除 MCP 服务。
   * @param configAccessToken 管理密钥。
   * @param id 待删除服务的 ID。
   * @returns 无返回值。
   */
  const deleteMcpServer = (configAccessToken: string, id: string): Promise<void> =>
    mcpRequest(configAccessToken, `/servers/${id}`, { method: "DELETE" });

  /**
   * 测试连接 MCP 服务。
   * @param configAccessToken 管理密钥。
   * @param server 待测试的服务配置。
   * @returns 连接与工具发现结果。
   */
  const testMcpServer = async (configAccessToken: string, server: McpServerConfig): Promise<McpConnectionTest> => {
    const result = await mcpRequest<McpConnectionTest>(configAccessToken, "/test", {
      method: "POST",
      body: JSON.stringify(server),
    });
    // 旧版服务端可能只返回 tools 或只返回 toolCount，这里统一补全，避免界面显示“发现 个工具”或渲染崩溃。
    return {
      ...result,
      toolCount: result.toolCount ?? result.tools?.length ?? 0,
      tools: result.tools ?? [],
    };
  };
  return { listMcpServers, createMcpServer, updateMcpServer, deleteMcpServer, testMcpServer };
}
