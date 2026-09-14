import { Injectable } from "@nestjs/common";
import {
  createMcpServer,
  deleteMcpServer,
  listMcpServers,
  updateMcpServer,
  type McpServerConfig,
} from "../mcp-config.js";
import { testMcpServer } from "../mcp.js";
import { clearCodexThreadIds } from "../store.js";

/**
 * 管理 MCP 配置及连接测试。
 * 配置变化后清空 Codex thread，确保下一轮重新加载最新工具集合。
 */
@Injectable()
export class McpConfigService {
  list(): Promise<McpServerConfig[]> {
    return listMcpServers();
  }

  async create(input: McpServerConfig): Promise<McpServerConfig> {
    const server = await createMcpServer(input);
    await clearCodexThreadIds();
    return server;
  }

  async update(id: string, input: McpServerConfig): Promise<McpServerConfig> {
    const server = await updateMcpServer(id, input);
    await clearCodexThreadIds();
    return server;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await deleteMcpServer(id);
    if (deleted) await clearCodexThreadIds();
    return deleted;
  }

  test(input: McpServerConfig): ReturnType<typeof testMcpServer> {
    return testMcpServer(input);
  }
}
