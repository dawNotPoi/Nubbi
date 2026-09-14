import { Injectable } from "@nestjs/common";
import { listMcpServers } from "../mcp-config.js";
import { discoverMcpTools } from "../mcp.js";
import { listSkills } from "../skills.js";

export type ExtensionResponse = {
  skills: { name: string; description: string }[];
  servers: {
    id: string;
    name: string;
    transport: "http";
    endpoint: string;
    toolCount: number;
  }[];
};

/** 聚合 Skill、MCP 配置和工具发现结果，生成客户端需要的能力视图。 */
@Injectable()
export class ExtensionsService {
  /**
   * 聚合 Skill、MCP 配置与工具发现结果。
   * @returns 客户端需要的能力视图（Skill 列表 + 服务列表与各自工具数）。
   */
  async list(): Promise<ExtensionResponse> {
    const [skills, servers, tools] = await Promise.all([
      listSkills(),
      listMcpServers(),
      discoverMcpTools(),
    ]);
    return {
      skills: skills.map(({ name, description }) => ({ name, description })),
      servers: servers.map((server) => ({
        id: server.id,
        name: server.name,
        transport: "http",
        endpoint: server.url,
        toolCount: tools.filter((tool) => tool.server.id === server.id).length,
      })),
    };
  }
}
