import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// API 地址可放在普通存储；配置密钥必须用系统安全存储保存。
const API_URL_KEY = "assistant-api-url";
const CONFIG_TOKEN_KEY = "assistant-config-token";

/**
 * 校验并规范化 API 地址：去首尾空白、去末尾斜杠，且必须为 http(s) 协议。
 * @param value 用户填写的原始地址。
 * @returns 规范化后的地址；协议非法时抛出异常。
 */
export const normalizeApiUrl = (value: string): string => {
  const normalized = value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error("API 地址必须以 http:// 或 https:// 开头");
  }
  return normalized;
};

/**
 * 读取已保存的 API 地址。
 * @returns 保存的地址；从未保存时返回空字符串。
 */
export const readApiUrl = async (): Promise<string> => (await AsyncStorage.getItem(API_URL_KEY)) ?? "";

/**
 * 保存 API 地址（先规范化再写入）。
 * @param value 用户填写的原始地址。
 * @returns 规范化后的地址。
 */
export const saveApiUrl = async (value: string): Promise<string> => {
  const normalized = normalizeApiUrl(value);
  await AsyncStorage.setItem(API_URL_KEY, normalized);
  return normalized;
};

/**
 * 读取已保存的配置管理密钥。
 * @returns 密钥；从未保存时返回空字符串。
 */
export const readConfigToken = async (): Promise<string> => (await SecureStore.getItemAsync(CONFIG_TOKEN_KEY)) ?? "";

/**
 * 保存或清除配置管理密钥。
 * @param value 新的密钥，空字符串表示清除。
 * @returns 无返回值。
 */
export const saveConfigToken = async (value: string): Promise<void> => {
  if (value) await SecureStore.setItemAsync(CONFIG_TOKEN_KEY, value);
  else await SecureStore.deleteItemAsync(CONFIG_TOKEN_KEY);
};
