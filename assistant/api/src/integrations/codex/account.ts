import { codexClient } from "./client.ts";
import type { AccountResponse, DeviceLoginResponse, ModelListResponse } from "./protocol.ts";

/**
 * 读取当前 Codex 账号信息（是否已登录 ChatGPT、订阅类型等）。
 * @returns 账号状态与是否需要 OpenAI 认证的标记。
 */
export const readCodexAccount = async (): Promise<AccountResponse> =>
  codexClient.request<AccountResponse>("account/read", { refreshToken: false });

/**
 * 发起设备码登录流程，返回验证 URL 与用户代码。
 * @returns 设备登录信息，需用户到 verificationUrl 输入 userCode 完成授权。
 */
export const startCodexDeviceLogin = async (): Promise<DeviceLoginResponse> => {
  const response = await codexClient.request<DeviceLoginResponse>("account/login/start", { type: "chatgptDeviceCode" });
  if (response.type !== "chatgptDeviceCode") {
    throw new Error("Codex 未返回设备登录信息");
  }
  return response;
};

/**
 * 退出 ChatGPT 登录。
 * @returns 无返回值；退出失败时抛出异常。
 */
export const logoutCodex = async (): Promise<void> => {
  await codexClient.request("account/logout");
};

/**
 * 分页拉取全部可用 Codex 模型，直到 nextCursor 为空。
 * @returns 去重前全量可用模型列表。
 */
export const listCodexModels = async (): Promise<ModelListResponse["data"]> => {
  const models: ModelListResponse["data"] = [];
  let cursor: string | null = null;
  do {
    const page: ModelListResponse = await codexClient.request<ModelListResponse>("model/list", {
      cursor,
      limit: 100,
      includeHidden: false,
    });
    models.push(...page.data);
    cursor = page.nextCursor;
  } while (cursor);
  return models;
};
