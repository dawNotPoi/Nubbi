import type { ExtensionsState } from "./use-extensions-state.ts";
import { readConfigAccessToken } from "../../platform/config-access-storage.ts";
import { useCallback, useEffect, useState } from "react";
import { listExtensions, setMcpServerEnabled, setSkillEnabled } from "../../platform/assistant-api.ts";
import type { ExtensionInfo } from "../../types.ts";

/** 设置管理密钥在 sessionStorage 中的键名，与设置抽屉保持一致。 */

/**
 * 拉取当前配置的全部 Skill 与 MCP 服务（含启用状态），并提供启停操作。
 * 供 /skill 与 /mcp 命令展示完整能力清单并直接控制启用状态。
 * @returns 技能列表、服务列表、启停操作与刷新。
 */
export const useExtensions = (): ExtensionsState => {
  const [skills, setSkills] = useState<ExtensionInfo["skills"]>([]);
  const [servers, setServers] = useState<ExtensionInfo["servers"]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * 重新拉取能力清单；失败时保留上次数据并记录错误。
   * @returns 刷新完成后的 Promise。
   */
  const refresh = useCallback(async () => {
    try {
      const data = await listExtensions();
      setSkills(data.skills);
      setServers(data.servers);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "加载能力清单失败");
    }
  }, []);

  /**
   * 读取当前配置密钥，未解锁时写入提示并返回空串。
   * @returns 配置管理密钥；未解锁时为空串。
   */
  const requireToken = (): string => {
    const configAccessToken = readConfigAccessToken() ?? "";
    if (!configAccessToken) setError("请先解锁配置再启停能力");
    return configAccessToken;
  };

  /**
   * 切换单个 Skill 的启用状态，成功后同步本地状态。
   * @param name 技能名称。
   * @param enabled 目标启用状态。
   * @returns 切换完成后的 Promise。
   */
  const toggleSkill = useCallback(async (name: string, enabled: boolean) => {
    const configAccessToken = requireToken();
    if (!configAccessToken) return;
    try {
      await setSkillEnabled(configAccessToken, name, enabled);
      setSkills((current) => current.map((skill) => (skill.name === name ? { ...skill, enabled } : skill)));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新技能状态失败");
    }
  }, []);

  /**
   * 切换单个 MCP 服务的启用状态，成功后同步本地状态。
   * @param id 服务 ID。
   * @param enabled 目标启用状态。
   * @returns 切换完成后的 Promise。
   */
  const toggleServer = useCallback(async (id: string, enabled: boolean) => {
    const configAccessToken = requireToken();
    if (!configAccessToken) return;
    try {
      await setMcpServerEnabled(configAccessToken, id, enabled);
      setServers((current) => current.map((server) => (server.id === id ? { ...server, enabled } : server)));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新服务状态失败");
    }
  }, []);

  // 首次挂载时拉取一次。
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    skills,
    servers,
    error,
    unlocked: Boolean(readConfigAccessToken()),
    refresh,
    toggleSkill,
    toggleServer,
  };
};
