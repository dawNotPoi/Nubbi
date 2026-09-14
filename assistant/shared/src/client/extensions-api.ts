import type { ExtensionInfo, McpServerConfig } from "../contracts/index.ts";
import type { HttpTransport } from "./http-transport.ts";

/** extensions 业务接口，与平台无关。 */
export type ExtensionsApi = {
  listExtensions: () => Promise<ExtensionInfo>;
  setSkillEnabled: (
    configAccessToken: string,
    name: string,
    enabled: boolean,
  ) => Promise<{ name: string; enabled: boolean }>;
  setMcpServerEnabled: (configAccessToken: string, id: string, enabled: boolean) => Promise<McpServerConfig>;
};

/**
 * 绑定 extensions 接口的 HTTP 传输。
 * @param transport 请求能力。
 * @returns 业务接口。
 */
export function createExtensionsApi(transport: HttpTransport): ExtensionsApi {
  /**
   * 读取当前可发现的 Skill 与 MCP 服务（含启用状态）。
   * @returns 能力视图（Skill 列表 + 服务列表）。
   */
  const listExtensions = (): Promise<ExtensionInfo> => transport.request("/api/extensions");

  /**
   * 更新单个 Skill 的启用状态。
   * @param configAccessToken 配置管理密钥。
   * @param name 技能名称。
   * @param enabled 是否启用。
   * @returns 更新后的技能启用状态。
   */
  const setSkillEnabled = (
    configAccessToken: string,
    name: string,
    enabled: boolean,
  ): Promise<{ name: string; enabled: boolean }> =>
    transport.request(`/api/extensions/skills/${encodeURIComponent(name)}/enabled`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
      headers: { "x-config-token": configAccessToken },
    });

  /**
   * 仅更新 MCP 服务的启用状态。
   * @param configAccessToken 配置管理密钥。
   * @param id 服务 ID。
   * @param enabled 是否启用。
   * @returns 已保存的服务配置。
   */
  const setMcpServerEnabled = (configAccessToken: string, id: string, enabled: boolean): Promise<McpServerConfig> =>
    transport.configRequest(configAccessToken, `/api/mcp/servers/${id}/enabled`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
  return { listExtensions, setSkillEnabled, setMcpServerEnabled };
}
