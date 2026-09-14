import { Injectable } from "@nestjs/common";
import {
  createMcpServer,
  deleteMcpServer,
  listMcpServers,
  updateMcpServer,
  type McpServerConfig,
} from "../../integrations/mcp/mcp-config.ts";
import { testMcpServer } from "../../integrations/mcp/mcp.ts";
import { clearCodexThreadIds } from "../conversations/conversation.repository.ts";

/**
 * 管理 MCP 配置及连接测试。
 * 配置变化后清空 Codex thread，确保下一轮重新加载最新工具集合。
 */
@Injectable()
export class McpConfigService {
  /**
   * 列出全部 MCP 服务配置。
   * @returns 服务配置列表。
   */
  list(): Promise<McpServerConfig[]> {
    return listMcpServers();
  }

  /**
   * 新建 MCP 服务并清空 Codex 线程引用。
   * @param input 服务配置。
   * @returns 已保存的服务配置。
   */
  async create(input: McpServerConfig): Promise<McpServerConfig> {
    const server = await createMcpServer(input);
    await clearCodexThreadIds();
    return server;
  }

  /**
   * 更新 MCP 服务并清空 Codex 线程引用。
   * @param id 待更新服务的 ID。
   * @param input 新的服务配置。
   * @returns 已保存的服务配置。
   */
  async update(id: string, input: McpServerConfig): Promise<McpServerConfig> {
    const server = await updateMcpServer(id, input);
    await clearCodexThreadIds();
    return server;
  }

  /**
   * 仅更新 MCP 服务的启用状态并清空 Codex 线程引用。
   * @param id 待更新服务的 ID。
   * @param enabled 是否启用。
   * @returns 已保存的服务配置；服务不存在时抛异常。
   */
  async setEnabled(id: string, enabled: boolean): Promise<McpServerConfig> {
    const servers = await listMcpServers();
    const server = servers.find((item) => item.id === id);
    if (!server) throw new Error("MCP Server 不存在");
    const updated = await updateMcpServer(id, { ...server, enabled });
    await clearCodexThreadIds();
    return updated;
  }

  /**
   * 删除 MCP 服务；删除成功时清空 Codex 线程引用。
   * @param id 待删除服务的 ID。
   * @returns 是否确实删除了服务。
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await deleteMcpServer(id);
    if (deleted) await clearCodexThreadIds();
    return deleted;
  }

  /**
   * 测试连接 MCP 服务。
   * @param input 待测试的服务配置。
   * @returns 服务名、工具数量与工具清单。
   */
  test(input: McpServerConfig): ReturnType<typeof testMcpServer> {
    return testMcpServer(input);
  }
}
