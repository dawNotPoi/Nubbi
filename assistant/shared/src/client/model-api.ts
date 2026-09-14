import type { CodexAccount, CodexModel, DeviceLogin, ModelConfig, ModelConfigInput } from "../contracts/index.ts";
import type { HttpTransport } from "./http-transport.ts";

/** model 业务接口，与平台无关。 */
export type ModelApi = {
  getModelConfig: (configAccessToken: string) => Promise<ModelConfig>;
  saveModelConfig: (configAccessToken: string, config: ModelConfigInput) => Promise<ModelConfig>;
  fetchProviderModels: (
    configAccessToken: string,
    input: { baseUrl: string; apiKey?: string; headers?: Record<string, string> },
  ) => Promise<{ models: string[] }>;
  getCodexAccount: (configAccessToken: string) => Promise<CodexAccount>;
  startCodexLogin: (configAccessToken: string) => Promise<DeviceLogin>;
  logoutCodex: (configAccessToken: string) => Promise<void>;
  fetchCodexModels: (configAccessToken: string) => Promise<{ models: CodexModel[] }>;
};

/**
 * 绑定 model 接口的 HTTP 传输。
 * @param transport 请求能力。
 * @returns 业务接口。
 */
export function createModelApi(transport: HttpTransport): ModelApi {
  const modelRequest = <T>(configAccessToken: string, endpoint: string, init?: RequestInit): Promise<T> =>
    transport.configRequest<T>(configAccessToken, `/api/model${endpoint}`, init);

  /**
   * 读取模型配置。
   * @param configAccessToken 管理密钥。
   * @returns 对外可见的模型配置。
   */
  const getModelConfig = (configAccessToken: string): Promise<ModelConfig> =>
    modelRequest(configAccessToken, "/config");

  /**
   * 保存模型配置。
   * @param configAccessToken 管理密钥。
   * @param config 新的模型配置。
   * @returns 保存后对外可见的配置。
   */
  const saveModelConfig = (configAccessToken: string, config: ModelConfigInput): Promise<ModelConfig> =>
    modelRequest(configAccessToken, "/config", {
      method: "PUT",
      body: JSON.stringify(config),
    });

  /**
   * 拉取 Provider 可用模型列表。
   * @param configAccessToken 管理密钥。
   * @param input 连接参数（Base URL、可选的 API Key 与自定义请求头）。
   * @returns 模型 ID 列表。
   */
  const fetchProviderModels = (
    configAccessToken: string,
    input: { baseUrl: string; apiKey?: string; headers?: Record<string, string> },
  ): Promise<{ models: string[] }> =>
    modelRequest(configAccessToken, "/models", {
      method: "POST",
      body: JSON.stringify(input),
    });

  /**
   * 读取 Codex 账号信息。
   * @param configAccessToken 管理密钥。
   * @returns 账号状态。
   */
  const getCodexAccount = (configAccessToken: string): Promise<CodexAccount> =>
    modelRequest(configAccessToken, "/codex/account");

  /**
   * 发起 Codex 设备码登录。
   * @param configAccessToken 管理密钥。
   * @returns 设备登录信息。
   */
  const startCodexLogin = (configAccessToken: string): Promise<DeviceLogin> =>
    modelRequest(configAccessToken, "/codex/login", { method: "POST" });

  /**
   * 退出 Codex 登录。
   * @param configAccessToken 管理密钥。
   * @returns 无返回值。
   */
  const logoutCodex = (configAccessToken: string): Promise<void> =>
    modelRequest(configAccessToken, "/codex/logout", { method: "POST" });

  /**
   * 拉取全部 Codex 模型。
   * @param configAccessToken 管理密钥。
   * @returns Codex 模型列表。
   */
  const fetchCodexModels = (configAccessToken: string): Promise<{ models: CodexModel[] }> =>
    modelRequest(configAccessToken, "/codex/models");
  return {
    getModelConfig,
    saveModelConfig,
    fetchProviderModels,
    getCodexAccount,
    startCodexLogin,
    logoutCodex,
    fetchCodexModels,
  };
}
