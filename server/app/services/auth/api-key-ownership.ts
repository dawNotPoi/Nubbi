/** API Key 归属字段的最小兼容形状。 */
export type ApiKeyOwnershipFields = {
  referenceId?: unknown;
  userId?: unknown;
};

/**
 * 把数据库适配器可能返回的字符串或 BSON ObjectId 归一化为用户 ID。
 * @param value 待归一化的归属字段。
 * @returns 非空用户 ID；无法安全识别时返回 null。
 */
const normalizeOwnerId = (value: unknown): string | null => {
  if (typeof value === "string") return value || null;
  if (typeof value !== "object" || value === null) return null;

  try {
    const toHexString = (value as { toHexString?: unknown }).toHexString;
    if (typeof toHexString !== "function") return null;
    const normalized = toHexString.call(value);
    return typeof normalized === "string" && normalized ? normalized : null;
  } catch {
    return null;
  }
};

/**
 * 读取 API Key 所有者：优先使用规范 referenceId，并拒绝新旧字段冲突。
 * @param fields API Key 的新旧归属字段。
 * @returns 唯一可信的用户 ID；缺失或冲突时返回 null。
 */
export const resolveApiKeyOwnerId = (
  fields: ApiKeyOwnershipFields,
): string | null => {
  const hasReferenceId = Object.prototype.hasOwnProperty.call(
    fields,
    "referenceId",
  );
  let referenceId: string | null = null;
  if (hasReferenceId) {
    try {
      const value = fields.referenceId;
      referenceId = typeof value === "string" && value.length > 0 ? value : null;
    } catch {
      return null;
    }
  }
  const legacyUserId = normalizeOwnerId(fields.userId);

  if (hasReferenceId && referenceId === null) return null;
  if (referenceId && legacyUserId && referenceId !== legacyUserId) return null;
  return referenceId ?? legacyUserId;
};
