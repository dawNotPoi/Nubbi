const CONFIG_ACCESS_TOKEN_KEY = "assistant-config-token";

/**
 * 从浏览器会话存储读取管理密钥，存储不可用时保持未解锁。
 * @returns 已保存密钥或空字符串。
 */
export function readConfigAccessToken(): string {
  try {
    return sessionStorage.getItem(CONFIG_ACCESS_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * 保存或清除会话级管理密钥，不写入长期存储。
 * @param configAccessToken 新密钥，空字符串表示清除。
 * @returns 无返回值。
 */
export function saveConfigAccessToken(configAccessToken: string): void {
  if (configAccessToken) sessionStorage.setItem(CONFIG_ACCESS_TOKEN_KEY, configAccessToken);
  else sessionStorage.removeItem(CONFIG_ACCESS_TOKEN_KEY);
}
