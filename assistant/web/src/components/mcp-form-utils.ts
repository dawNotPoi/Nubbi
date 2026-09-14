export type KeyValuePair = { key: string; value: string };

/**
 * 对象 → 键值对数组，用于表单编辑。
 * @param record 原始键值对象。
 * @returns 键值对数组。
 */
export const recordToPairs = (
  record: Record<string, string>,
): KeyValuePair[] => Object.entries(record).map(([key, value]) => ({ key, value }));

/**
 * 键值对数组 → 对象；过滤空 key，key 做去空白处理。
 * @param pairs 表单编辑中的键值对数组。
 * @returns 过滤后的键值对象。
 */
export const pairsToRecord = (
  pairs: KeyValuePair[],
): Record<string, string> => Object.fromEntries(
  pairs
    .map((pair) => ({ key: pair.key.trim(), value: pair.value }))
    .filter((pair) => pair.key.length > 0)
    .map((pair) => [pair.key, pair.value]),
);
