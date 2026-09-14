/** 敏感字段名正则，匹配 authorization、password、secret、token、key 等 */
const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|password|secret|token|verification|api[-_]?key|^key$|^code$/i;
/** 日志深度截断上限，防止大对象撑爆日志 */
const MAX_LOG_DEPTH = 3;
/** 单条日志字符串最大长度 */
const MAX_LOG_STRING_LENGTH = 2_000;

/** 对字符串进行脱敏处理，替换 Bearer Token、JWT、API Key 等敏感信息 */
const sanitizeString = (value: string): string => {
  const sanitized = value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(
      /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g,
      "[REDACTED_JWT]",
    )
    .replace(/\bnb_[A-Za-z0-9_-]+\b/g, "[REDACTED_API_KEY]")
    .replace(
      /([?&](?:token|code|key|api[-_]?key|secret|password)=)[^&\s]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /\b(token|code|key|api[-_]?key|secret|password|cookie)\s*[:=]\s*["']?[^"',;\s}]+/gi,
      "$1=[REDACTED]",
    );

  return sanitized.length <= MAX_LOG_STRING_LENGTH
    ? sanitized
    : `${sanitized.slice(0, MAX_LOG_STRING_LENGTH)}…`;
};

/** 递归脱敏对象中的敏感字段 */
const sanitizeObject = (
  value: Record<string, unknown>,
  depth: number,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : sanitizeAuthLogValue(item, depth + 1),
    ]),
  );

/** 递归脱敏日志值，支持字符串、对象、数组和 Error */
const sanitizeAuthLogValue = (value: unknown, depth = 0): unknown => {
  if (value instanceof Error) {
    return { name: value.name, message: sanitizeString(value.message) };
  }
  if (typeof value === "string") return sanitizeString(value);
  if (depth >= MAX_LOG_DEPTH) return "[TRUNCATED]";
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuthLogValue(item, depth + 1));
  }
  if (typeof value === "object" && value !== null) {
    return sanitizeObject(value as Record<string, unknown>, depth);
  }
  return value;
};

/** 序列化 Better Auth 日志参数，自动脱敏敏感信息 */
export const serializeAuthLogArg = (value: unknown): unknown =>
  sanitizeAuthLogValue(value);

/** 脱敏日志消息中的敏感字符串 */
export const sanitizeAuthLogMessage = (value: string): string =>
  sanitizeString(value);
