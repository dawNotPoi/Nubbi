import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const API_URL_KEY = "assistant-api-url";
const CONFIG_TOKEN_KEY = "assistant-config-token";

export const normalizeApiUrl = (value: string): string => {
  const normalized = value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error("API 地址必须以 http:// 或 https:// 开头");
  }
  return normalized;
};

export const readApiUrl = async (): Promise<string> =>
  (await AsyncStorage.getItem(API_URL_KEY)) ?? "";

export const saveApiUrl = async (value: string): Promise<string> => {
  const normalized = normalizeApiUrl(value);
  await AsyncStorage.setItem(API_URL_KEY, normalized);
  return normalized;
};

export const readConfigToken = async (): Promise<string> =>
  (await SecureStore.getItemAsync(CONFIG_TOKEN_KEY)) ?? "";

export const saveConfigToken = async (value: string): Promise<void> => {
  if (value) await SecureStore.setItemAsync(CONFIG_TOKEN_KEY, value);
  else await SecureStore.deleteItemAsync(CONFIG_TOKEN_KEY);
};
