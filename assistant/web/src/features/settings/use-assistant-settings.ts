import type { AssistantSettingsState } from "./use-assistant-settings-state.ts";
import { readConfigAccessToken, saveConfigAccessToken } from "../../platform/config-access-storage.ts";

import { useCallback, useEffect, useState } from "react";
import {
  createMcpServer,
  deleteMcpServer,
  listMcpServers,
  testMcpServer,
  updateMcpServer,
} from "../../platform/assistant-api.ts";

import type { McpConnectionTest, McpServerConfig } from "../../types.ts";

/**
 * 管理设置解锁、MCP 配置和面板状态。
 * @param open 抽屉是否展开。
 * @returns 设置状态与操作。
 */
export function useAssistantSettings(open: boolean): AssistantSettingsState {
  const [configAccessToken, setToken] = useState(() => readConfigAccessToken() ?? "");
  const [tokenInput, setTokenInput] = useState("");
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [editing, setEditing] = useState<McpServerConfig | null | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [section, setSection] = useState<"model" | "mcp">("model");

  /**
   * 拉取 MCP 服务列表。
   * @param accessToken 配置管理密钥。
   * @returns 加载完成后的 Promise。
   */
  const load = useCallback(async (accessToken: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setServers(await listMcpServers(accessToken));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !configAccessToken) return;
    void load(configAccessToken).catch((caught: unknown) => {
      const message = caught instanceof Error ? caught.message : "加载 MCP 配置失败";
      setError(message);
      if (message.includes("密钥无效")) {
        saveConfigAccessToken("");
        setToken("");
      }
    });
  }, [load, open, configAccessToken]);

  /**
   * 用密钥请求一次配置接口完成解锁，成功则写入 sessionStorage。
   * @returns 解锁流程完成后的 Promise。
   */
  const unlock = async (): Promise<void> => {
    const next = tokenInput.trim();
    if (!next) return;
    try {
      await load(next);
      saveConfigAccessToken(next);
      setToken(next);
      setTokenInput("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "解锁失败");
    }
  };

  /**
   * 保存 MCP 服务（新增或更新）并刷新列表。
   * @param value 待保存的服务配置。
   * @returns 保存完成后的 Promise。
   */
  const save = async (value: McpServerConfig): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      if (editing) await updateMcpServer(configAccessToken, value);
      else await createMcpServer(configAccessToken, value);
      await load(configAccessToken);
      setEditing(undefined);
      setNotice("MCP 配置已保存");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 测试连接并返回结构化结果（含工具清单）。
   * @param value 待测试的服务配置。
   * @returns 连接测试结果；失败时抛出异常。
   */
  const test = async (value: McpServerConfig): Promise<McpConnectionTest> => {
    setLoading(true);
    setError(null);
    try {
      const result = await testMcpServer(configAccessToken, value);
      setNotice(value.name + "：连接成功，发现 " + (result.toolCount ?? result.tools?.length ?? 0) + " 个工具");
      return result;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 切换服务的启用状态。
   * @param server 目标服务配置。
   * @returns 更新完成后的 Promise。
   */
  const toggle = async (server: McpServerConfig): Promise<void> => {
    setLoading(true);
    try {
      await updateMcpServer(configAccessToken, { ...server, enabled: !server.enabled });
      await load(configAccessToken);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新失败");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除服务（带确认）并刷新列表。
   * @param server 待删除的服务配置。
   * @returns 删除完成后的 Promise。
   */
  const remove = async (server: McpServerConfig): Promise<void> => {
    if (!window.confirm(`删除 MCP Server「${server.name}」？`)) return;
    setLoading(true);
    try {
      await deleteMcpServer(configAccessToken, server.id ?? "");
      await load(configAccessToken);
      setNotice("MCP 配置已删除");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 锁定设置：清除本地密钥并回到解锁页。
   * @returns 无返回值。
   */
  const lock = (): void => {
    saveConfigAccessToken("");
    setToken("");
    setServers([]);
    setEditing(undefined);
    setError(null);
  };

  return {
    configAccessToken,
    tokenInput,
    setTokenInput,
    servers,
    editing,
    setEditing,
    loading,
    error,
    setError,
    notice,
    section,
    setSection,
    unlock,
    save,
    remove,
    test,
    toggle,
    lock,
  };
}
