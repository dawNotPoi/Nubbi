import { Injectable } from "@nestjs/common";
import { listMcpServers } from "../../integrations/mcp/mcp-config.ts";
import { discoverMcpTools } from "../../integrations/mcp/mcp.ts";
import { listAllSkills, setSkillEnabled } from "../../integrations/skills/skill-store.ts";

/** 技能和 MCP 的可展示能力清单，不包含连接密钥。 */
export type ExtensionResponse = {
  skills: { name: string; description: string; enabled: boolean }[];
  servers: {
    id?: string;
    name: string;
    transport: "http" | "stdio";
    endpoint?: string;
    enabled: boolean;
    toolCount: number;
  }[];
};

/** 聚合 Skill、MCP 配置和工具发现结果，生成客户端需要的能力视图。 */
@Injectable()
export class ExtensionsService {
  /**
   * 聚合 Skill、MCP 配置与工具发现结果。
   * @returns 客户端需要的能力视图（含启用状态的 Skill 列表 + 服务列表与各自工具数）。
   */
  async list(): Promise<ExtensionResponse> {
    const [skills, servers, tools] = await Promise.all([listAllSkills(), listMcpServers(), discoverMcpTools()]);
    return {
      skills: skills.map(({ name, description, enabled }) => ({ name, description, enabled })),
      servers: servers.map((server) => ({
        id: server.id,
        name: server.name,
        transport: server.transport ?? "http",
        endpoint: server.url ?? server.command,
        enabled: server.enabled,
        toolCount: tools.filter((tool) => tool.server.id === server.id).length,
      })),
    };
  }

  /**
   * 更新单个技能的启用状态。
   * @param name 技能名称。
   * @param enabled 是否启用。
   * @returns 更新后的技能信息；技能不存在时返回 null。
   */
  async toggleSkill(name: string, enabled: boolean): Promise<{ name: string; enabled: boolean } | null> {
    const updated = await setSkillEnabled(name, enabled);
    return updated ? { name: updated.name, enabled: updated.enabled } : null;
  }
}
