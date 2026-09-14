import { fetch } from "expo/fetch";
import { createAssistantClient } from "@nubbi/assistant-shared/client";
import type { CodexAccount, CodexModel, DeviceLogin, ModelConfig, ModelConfigInput } from "../types.ts";

/**
 * 读取模型配置。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @returns 对外可见的模型配置。
 */
export const getModelConfig = (assistantApiBaseUrl: string, configAccessToken: string): Promise<ModelConfig> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).getModelConfig(
    configAccessToken,
  );

/**
 * 保存模型配置。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @param input 新的模型配置。
 * @returns 保存后对外可见的配置。
 */
export const saveModelConfig = (
  assistantApiBaseUrl: string,
  configAccessToken: string,
  input: ModelConfigInput,
): Promise<ModelConfig> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).saveModelConfig(
    configAccessToken,
    input,
  );

/**
 * 拉取 Provider 可用模型列表。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @param input 连接参数（Base URL、可选的 API Key 与自定义请求头）。
 * @returns 模型 ID 列表。
 */
export const fetchProviderModels = (
  assistantApiBaseUrl: string,
  configAccessToken: string,
  input: { baseUrl: string; apiKey?: string; headers?: Record<string, string> },
): Promise<{ models: string[] }> =>
  createAssistantClient({ assistantApiBaseUrl, fetchResponse: fetch }).fetchProviderModels(configAccessToken, input);

/**
 * 读取 Codex 账号信息。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @returns 账号状态。
 */
export const getCodexAccount = (assistantApiBaseUrl: string, configAccessToken: string): Promise<CodexAccount> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).getCodexAccount(
    configAccessToken,
  );

/**
 * 发起 Codex 设备码登录。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @returns 设备登录信息。
 */
export const startCodexLogin = (assistantApiBaseUrl: string, configAccessToken: string): Promise<DeviceLogin> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).startCodexLogin(
    configAccessToken,
  );

/**
 * 退出 Codex 登录。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @returns 无返回值。
 */
export const logoutCodex = (assistantApiBaseUrl: string, configAccessToken: string): Promise<void> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).logoutCodex(
    configAccessToken,
  );

/**
 * 拉取全部 Codex 模型。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param configAccessToken 管理密钥。
 * @returns Codex 模型列表。
 */
export const fetchCodexModels = (
  assistantApiBaseUrl: string,
  configAccessToken: string,
): Promise<{ models: CodexModel[] }> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).fetchCodexModels(
    configAccessToken,
  );
