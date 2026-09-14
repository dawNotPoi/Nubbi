import { codexClient } from "./client.js";
import type {
  AccountResponse,
  DeviceLoginResponse,
  ModelListResponse,
} from "./protocol.js";

export const readCodexAccount = async (): Promise<AccountResponse> =>
  codexClient.request<AccountResponse>("account/read", { refreshToken: false });

export const startCodexDeviceLogin = async (): Promise<DeviceLoginResponse> => {
  const response = await codexClient.request<DeviceLoginResponse>(
    "account/login/start",
    { type: "chatgptDeviceCode" },
  );
  if (response.type !== "chatgptDeviceCode") {
    throw new Error("Codex 未返回设备登录信息");
  }
  return response;
};

export const logoutCodex = async (): Promise<void> => {
  await codexClient.request("account/logout");
};

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
