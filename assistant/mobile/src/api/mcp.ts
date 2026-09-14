import { fetch } from "expo/fetch";
import { createAssistantClient } from "@nubbi/assistant-shared/client";
import type { McpConnectionTest, McpServerConfig } from "../types.ts";

/**
 * 列出全部 MCP 服务配置。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @returns 服务配置列表。
 */
export const listMcpServers = (assistantApiBaseUrl: string, configAccessToken: string): Promise<McpServerConfig[]> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).listMcpServers(
    configAccessToken,
  );

/**
 * 新建 MCP 服务。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @param server 服务配置。
 * @returns 已保存的服务配置。
 */
export const createMcpServer = (
  assistantApiBaseUrl: string,
  configAccessToken: string,
  server: McpServerConfig,
): Promise<McpServerConfig> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).createMcpServer(
    configAccessToken,
    server,
  );

/**
 * 更新 MCP 服务。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @param server 新的服务配置（含原 ID）。
 * @returns 已保存的服务配置。
 */
export const updateMcpServer = (
  assistantApiBaseUrl: string,
  configAccessToken: string,
  server: McpServerConfig,
): Promise<McpServerConfig> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).updateMcpServer(
    configAccessToken,
    server,
  );

/**
 * 删除 MCP 服务。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @param id 待删除服务的 ID。
 * @returns 无返回值。
 */
export const deleteMcpServer = (assistantApiBaseUrl: string, configAccessToken: string, id: string): Promise<void> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).deleteMcpServer(
    configAccessToken,
    id,
  );

/**
 * 测试连接 MCP 服务。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @param server 待测试的服务配置。
 * @returns 连接与工具发现结果。
 */
export const testMcpServer = (
  assistantApiBaseUrl: string,
  configAccessToken: string,
  server: McpServerConfig,
): Promise<McpConnectionTest> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).testMcpServer(
    configAccessToken,
    server,
  );
