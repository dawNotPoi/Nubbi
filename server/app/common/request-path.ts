/** 对请求路径中的敏感段（如重置密码 token）做脱敏，避免泄漏到日志 */
const redactPathSecrets = (pathname: string): string =>
  pathname.replace(
    /(\/reset-password\/)[^/]+/gi,
    "$1[REDACTED]",
  );

/** 提取安全的请求路径：去除查询字符串并脱敏敏感段，用于日志记录 */
export const getSafeRequestPath = (
  originalUrl: string,
  fallbackPath = "/",
): string => {
  const pathname = originalUrl.split("?")[0] || fallbackPath;
  return redactPathSecrets(pathname);
};
